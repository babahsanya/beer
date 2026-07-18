import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchLimiter, aiLimiter, getClientIp } from '@/lib/rate-limit';
import {
  searchBeersCached,
  normalizeUntappdBeers,
  isUntappdAvailable,
  normalizeUntappdBeer,
} from '@/lib/untappd';

// Escape LIKE wildcards in user input to prevent wildcard injection
function escapeLike(str: string): string {
  return str
    .replace(/!/g, '!!')
    .replace(/%/g, '!%')
    .replace(/_/g, '!_');
}

// Bilingual alias expansion: Russian → English
const RU_EN_ALIASES: Record<string, string> = {
  стаут: 'stout', ипа: 'ipa', лагер: 'lager', эль: 'ale',
  пшеничн: 'wheat', бельгийск: 'belgian', американск: 'american',
  имперск: 'imperial', портер: 'porter', кислый: 'sour',
  трипель: 'tripel', пилснер: 'pilsner', вайсбир: 'witbier',
  'тёмн': 'dark', 'тёмные': 'dark', креп: 'strong', рис: 'rice',
  фрукт: 'fruit', овсян: 'oatmeal', пале: 'pale', дабл: 'double',
  квдрупель: 'quadrupel', сезон: 'saison', кольш: 'kolsch',
  коьш: 'kolsch', лэмбик: 'lambic', сессион: 'session',
  виенн: 'vienna', советск: 'soviet', европейск: 'european',
  яг: 'ipa', стауд: 'stout', дозер: 'dozer',
  корона: 'corona', хайнекен: 'heineken', гиннесс: 'guinness',
  будвайзер: 'budweiser', стопка: 'stout', вайс: 'wheat',
  дюбель: 'dubbel', сингл: 'single',IPA: 'ipa',
};

function expandAliases(query: string): string[] {
  const queryLower = query.toLowerCase();
  const englishTerms = new Set<string>();
  for (const [ru, en] of Object.entries(RU_EN_ALIASES)) {
    if (queryLower.includes(ru) || ru.startsWith(queryLower)) {
      englishTerms.add(en);
    }
  }
  return Array.from(englishTerms);
}

function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const matrix: number[][] = Array.from({ length: la + 1 }, () =>
    new Array(lb + 1).fill(0)
  );
  for (let i = 0; i <= la; i++) matrix[i][0] = i;
  for (let j = 0; j <= lb; j++) matrix[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[la][lb];
}

// --- LOCAL DATABASE SEARCH ---

const MAX_FUZZY_SCAN = 500;

async function searchLocal(
  qTrimmed: string,
  limit: number,
  offset: number,
  sortBy: string
): Promise<{ beers: Record<string, unknown>[]; total: number }> {
  const likePattern = `%${escapeLike(qTrimmed.toLowerCase())}%`;
  const englishAliases = expandAliases(qTrimmed);
  const aliasPatterns = englishAliases.map(en => `%${en.toLowerCase()}%`);

  const ESC = " ESCAPE '!'";
  const conditions: string[] = [
    `LOWER("name") LIKE ?${ESC}`,
    `LOWER("style") LIKE ?${ESC}`,
    `LOWER("brewery") LIKE ?${ESC}`,
    `LOWER("country") LIKE ?${ESC}`,
    `LOWER("description") LIKE ?${ESC}`,
  ];
  const params: unknown[] = [likePattern, likePattern, likePattern, likePattern, likePattern];

  for (const ap of aliasPatterns) {
    conditions.push(`LOWER("name") LIKE ?${ESC}`);
    params.push(ap);
    conditions.push(`LOWER("style") LIKE ?${ESC}`);
    params.push(ap);
  }

  const whereClause = conditions.join(' OR ');
  const ALLOWED_SORT = new Set(['rating', 'abv', 'checkins']);
  const safeSortBy = ALLOWED_SORT.has(sortBy) ? sortBy : 'rating';

  let orderClause = '"rating" DESC';
  if (safeSortBy === 'abv') orderClause = '"abv" DESC';
  if (safeSortBy === 'checkins') orderClause = '"totalCheckins" DESC';

  const [beers, totalResult] = await Promise.all([
    db.$queryRawUnsafe(
      `SELECT * FROM "Beer" WHERE ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`,
      ...params, limit, offset
    ),
    db.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM "Beer" WHERE ${whereClause}`,
      ...params
    ),
  ]);

  const totalRaw = (totalResult as Array<{ count: bigint | number }>)[0]?.count || 0;
  let total = Number(totalRaw);

  // Fuzzy fallback
  let fuzzyBeers: unknown[] = [];
  if (total === 0) {
    const maxDist = Math.max(2, Math.floor(qTrimmed.length / 2));
    const queryLower = qTrimmed.toLowerCase();
    const allBeers = await db.$queryRawUnsafe(
      `SELECT * FROM "Beer" LIMIT ?`,
      MAX_FUZZY_SCAN
    ) as Array<Record<string, unknown>>;

    const scored = allBeers.map(beer => {
      const name = String(beer.name || '').toLowerCase();
      const words = name.split(/\s+/);
      const firstWord = words[0] || '';
      const minDist = Math.min(
        levenshtein(queryLower, name),
        levenshtein(queryLower, firstWord),
        ...words.map(w => levenshtein(queryLower, w))
      );
      return { beer, dist: minDist };
    });

    const matched = scored.filter(s => s.dist <= maxDist);
    matched.sort((a, b) => a.dist - b.dist);
    fuzzyBeers = matched.slice(offset, offset + limit).map(s => s.beer);
    total = matched.length;
  }

  const finalBeers = total === 0 ? [] : (totalRaw ? beers : fuzzyBeers);
  return { beers: finalBeers as Record<string, unknown>[], total };
}

// --- ONLINE SEARCH: Untappd API ---

async function searchOnline(
  qTrimmed: string,
  limit: number
): Promise<ReturnType<typeof normalizeUntappdBeers>> {
  if (!(await isUntappdAvailable())) return [];

  try {
    const items = await searchBeersCached(qTrimmed, limit);
    if (items.length > 0) {
      console.log(`[searchOnline] Untappd: ${items.length} results for "${qTrimmed}"`);
      return normalizeUntappdBeers(items);
    }
  } catch (err) {
    console.error('[searchOnline] Untappd error:', (err as Error).message);
  }

  // Try English aliases if Russian query didn't match
  const aliases = expandAliases(qTrimmed);
  if (aliases.length > 0) {
    for (const alias of aliases) {
      try {
        const items = await searchBeersCached(alias, limit);
        if (items.length > 0) {
          console.log(`[searchOnline] Untappd (alias "${alias}"): ${items.length} results`);
          return normalizeUntappdBeers(items);
        }
      } catch {
        continue;
      }
    }
  }

  return [];
}

// --- MAIN UNIFIED SEARCH ---

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const searchCheck = searchLimiter(clientIp);
    if (!searchCheck.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Подождите немного.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((searchCheck.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';

    if (q.length > 200 || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(q)) {
      return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }

    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const sortBy = searchParams.get('sort') || 'rating';
    const noWeb = searchParams.get('noweb') === 'true';

    if (!q.trim()) {
      return NextResponse.json({
        beers: [],
        sources: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    const qTrimmed = q.trim();

    // Rate limiting for API-powered search
    if (!noWeb) {
      const aiCheck = aiLimiter(clientIp);
      if (!aiCheck.allowed) {
        const localResult = await searchLocal(qTrimmed, limit, offset, sortBy);
        const beers = localResult.beers.map(b => ({ ...b, _source: 'local' }));
        return NextResponse.json({
          beers,
          sources: localResult.total > 0 ? ['local'] : [],
          localCount: localResult.total,
          onlineCount: 0,
          pagination: { total: localResult.total, limit, offset, hasMore: offset + beers.length < localResult.total },
          rateLimited: true,
        });
      }
    }

    // Run local + online search in parallel
    const [localResult, onlineBeers] = await Promise.all([
      searchLocal(qTrimmed, limit, offset, sortBy),
      noWeb ? Promise.resolve([] as ReturnType<typeof searchOnline>) : searchOnline(qTrimmed, limit),
    ]);

    const sources: string[] = [];
    if (localResult.total > 0) sources.push('local');
    if (onlineBeers.length > 0) sources.push('online');

    const localNames = new Set<string>();
    const mergedBeers: Record<string, unknown>[] = [];

    for (const beer of localResult.beers) {
      const name = String(beer.name || '').toLowerCase().trim();
      localNames.add(name);
      mergedBeers.push({ ...beer, _source: 'local' });
    }

    for (const ob of onlineBeers) {
      const name = ob.name.toLowerCase().trim();
      if (localNames.has(name)) continue;

      if (offset === 0 || mergedBeers.length < limit) {
        mergedBeers.push({
          id: ob.id,
          name: ob.name,
          style: ob.style,
          abv: ob.abv,
          ibu: ob.ibu,
          country: ob.country,
          brewery: ob.brewery,
          description: ob.description,
          label: ob.label,
          rating: ob.rating,
          ratingCount: ob.ratingCount,
          totalCheckins: ob.totalCheckins,
          monthlyCheckins: ob.monthlyCheckins,
          dailyCheckins: ob.dailyCheckins,
          source: 'untappd',
          _source: 'online',
          // Untappd extras
          untappdId: ob.untappdId,
          breweryId: ob.breweryId,
          breweryLabel: ob.breweryLabel,
          breweryUrl: ob.breweryUrl,
          isProduction: ob.isProduction,
        });
      }
    }

    const totalMerged = localResult.total + onlineBeers.filter(
      ob => !localNames.has(ob.name.toLowerCase().trim())
    ).length;

    try {
      await db.searchHistory.create({
        data: { query: qTrimmed.slice(0, 200), resultCount: mergedBeers.length },
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({
      beers: mergedBeers,
      sources,
      localCount: localResult.total,
      onlineCount: onlineBeers.length,
      pagination: {
        total: totalMerged,
        limit,
        offset,
        hasMore: mergedBeers.length < totalMerged,
      },
    });
  } catch (error) {
    console.error('Unified search error:', error);
    return NextResponse.json({ error: 'Ошибка при поиске пива' }, { status: 500 });
  }
}