import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { readLimiter, getClientIp } from '@/lib/rate-limit';
import { apiSuccess, apiBadRequest, apiTooManyRequests, apiInternalError } from '@/lib/api';

// Hard caps on the client-sent `exclude` parameter:
//   - 5000 chars total (the comma-separated string)
//   - 200 IDs max
//
// Without these caps a malicious client could send a giant exclude list to
// DoS the query (the IDs get joined into a NOT IN clause).
const MAX_EXCLUDE_CHARS = 5000;
const MAX_EXCLUDE_IDS = 200;

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'K';
  }
  return String(n);
}

function parseExcludeParam(raw: string): Set<string> {
  if (!raw) return new Set();
  if (raw.length > MAX_EXCLUDE_CHARS) {
    // Truncate rather than reject — clients may send legitimate long lists
    // when they've already played many rounds. Cap at the first 200 IDs.
    raw = raw.slice(0, MAX_EXCLUDE_CHARS);
  }
  const ids = raw
    .split(',')
    .filter((id) => id.length > 0 && id.length < 100)
    .slice(0, MAX_EXCLUDE_IDS);
  return new Set(ids);
}

/**
 * GET /api/quiz
 *
 * Returns one quiz question (or N if `?count=N` is passed) with the correct
 * answer + 3 distractors.
 *
 * Stage 4.5 of the audit recovery: replaced `findMany` (which loaded the
 * entire Beer table) with `count()` + `findFirst({ skip: random })`. Added
 * `?count=N` batch mode so the client can fetch all 10 questions in one
 * request instead of 10 sequential fetches.
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests(
        'Слишком много запросов',
        Math.ceil((rl.resetAt - Date.now()) / 1000),
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const excludeParam = searchParams.get('exclude') || '';
    const excludeIds = parseExcludeParam(excludeParam);

    // Optional batch mode — fetch N questions in one request.
    const requestedCount = parseInt(searchParams.get('count') || '1', 10);
    const count = Math.min(Math.max(requestedCount || 1, 1), 10);

    const totalBeers = await db.beer.count();
    if (totalBeers < 4) {
      return apiBadRequest('Недостаточно пива в базе');
    }

    // If the exclude list would shrink the available pool below 4, ignore it
    // (the client can keep playing without repeats being guaranteed).
    const effectiveExclude = totalBeers - excludeIds.size >= 4 ? excludeIds : new Set<string>();

    const questions: unknown[] = [];

    // Track the IDs we pick in this batch so we don't repeat within the
    // same response (the client also gets them via `exclude` on the next
    // call).
    const usedIds = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Pick a random correct beer via count + skip.
      // Apply exclude by computing the eligible count and skipping inside
      // the eligible pool. Prisma's `skip` doesn't honour `where`, so we
      // pass the where clause through too.
      const where = excludeIds.size > 0 || usedIds.size > 0
        ? { id: { notIn: [...effectiveExclude, ...usedIds] } }
        : undefined;

      const eligibleCount = where
        ? await db.beer.count({ where })
        : totalBeers;

      if (eligibleCount < 4) {
        // Pool exhausted — fall back to the full pool for this round.
        const fallbackCount = totalBeers;
        const fallbackSkip = Math.floor(Math.random() * fallbackCount);
        const correctBeer = await db.beer.findFirst({
          skip: fallbackSkip,
          select: {
            id: true, name: true, style: true, abv: true, ibu: true,
            country: true, rating: true, totalCheckins: true,
          },
        });
        if (!correctBeer) break;

        // Pick 3 distractors from the rest of the pool.
        const distractors = await db.beer.findMany({
          where: { id: { not: correctBeer.id } },
          select: { name: true },
          take: 50,
        });
        if (distractors.length < 3) break;

        const wrong = shuffleArray(distractors).slice(0, 3).map((d) => d.name);
        const options = shuffleArray([correctBeer.name, ...wrong]);
        const correctOptionIndex = options.indexOf(correctBeer.name);

        questions.push({
          id: correctBeer.id,
          fact1: `Это ${correctBeer.style} из ${correctBeer.country}`,
          fact2: `Крепкость ${correctBeer.abv}%, горечь ${correctBeer.ibu} IBU`,
          fact3: `Рейтинг ${correctBeer.rating}, ${formatNumber(correctBeer.totalCheckins)} чекинов`,
          options,
          correctIndex: correctOptionIndex,
          beerName: correctBeer.name,
        });
        usedIds.add(correctBeer.id);
        continue;
      }

      const skip = Math.floor(Math.random() * eligibleCount);
      const correctBeer = await db.beer.findFirst({
        where,
        skip,
        select: {
          id: true, name: true, style: true, abv: true, ibu: true,
          country: true, rating: true, totalCheckins: true,
        },
      });
      if (!correctBeer) break;

      // Pick 3 distractors from beers we haven't used yet in this batch.
      const distractorWhere = {
        id: {
          notIn: [correctBeer.id, ...usedIds, ...effectiveExclude],
        },
      };
      const distractors = await db.beer.findMany({
        where: distractorWhere,
        select: { name: true },
        take: 50,
      });
      if (distractors.length < 3) break;

      const wrong = shuffleArray(distractors).slice(0, 3).map((d) => d.name);
      const options = shuffleArray([correctBeer.name, ...wrong]);
      const correctOptionIndex = options.indexOf(correctBeer.name);

      questions.push({
        id: correctBeer.id,
        fact1: `Это ${correctBeer.style} из ${correctBeer.country}`,
        fact2: `Крепкость ${correctBeer.abv}%, горечь ${correctBeer.ibu} IBU`,
        fact3: `Рейтинг ${correctBeer.rating}, ${formatNumber(correctBeer.totalCheckins)} чекинов`,
        options,
        correctIndex: correctOptionIndex,
        beerName: correctBeer.name,
      });
      usedIds.add(correctBeer.id);
    }

    if (questions.length === 0) {
      return apiBadRequest('Не удалось сформировать вопрос');
    }

    // Single-question mode returns the question directly; batch mode wraps
    // it in an array. Both stay inside the apiSuccess envelope.
    if (count === 1) {
      return apiSuccess(questions[0]);
    }
    return apiSuccess({ questions });
  } catch (error) {
    console.error('Quiz API error:', error);
    return apiInternalError('Не удалось загрузить вопрос');
  }
}
