import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { searchLimiter, getClientIp } from '@/lib/rate-limit';
import { escapeLike, expandAliases } from '@/lib/beer-aliases';
import { searchQuerySchema } from '@/lib/validation';

// Suggestions need at least 2 chars after trimming — the underlying
// searchQuerySchema enforces max 200 + no control chars; we layer a
// post-trim min-length on top so " a" still counts as length 1.
const suggestionsQuerySchema = searchQuerySchema.refine(
  (q) => q.length >= 2,
  'Query too short (min 2 chars)',
);

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request);
    const rl = searchLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ suggestions: [], styles: [] });
    }

    const qRaw = request.nextUrl.searchParams.get('q') ?? '';
    const qResult = suggestionsQuerySchema.safeParse(qRaw);
    if (!qResult.success) {
      return NextResponse.json({ suggestions: [], styles: [] });
    }
    const qTrimmed = qResult.data;

    const qLower = qTrimmed.toLowerCase();
    const escapedQ = escapeLike(qLower);
    const ESC = " ESCAPE '!'";
    const prefix = `${escapedQ}%`;
    const contains = `%${escapedQ}%`;

    // Check for Russian aliases
    const englishAliases = expandAliases(qLower);
    const aliasPrefixes = englishAliases.map((en) => `${en}%`);
    const aliasContains = englishAliases.map((en) => `%${en}%`);

    // Build conditions
    const nameConditions = [
      `LOWER("name") LIKE ?${ESC}`,
      `LOWER("name") LIKE ?${ESC}`,
    ];
    const nameParams: unknown[] = [prefix, contains];

    for (const ap of aliasPrefixes) {
      nameConditions.push(`LOWER("name") LIKE ?${ESC}`);
      nameParams.push(ap);
    }
    for (const ac of aliasContains) {
      nameConditions.push(`LOWER("name") LIKE ?${ESC}`);
      nameParams.push(ac);
    }

    const styleConditions = [
      `LOWER("style") LIKE ?${ESC}`,
      `LOWER("style") LIKE ?${ESC}`,
    ];
    const styleParams: unknown[] = [prefix, contains];

    for (const ap of aliasPrefixes) {
      styleConditions.push(`LOWER("style") LIKE ?${ESC}`);
      styleParams.push(ap);
    }
    for (const ac of aliasContains) {
      styleConditions.push(`LOWER("style") LIKE ?${ESC}`);
      styleParams.push(ac);
    }

    const [nameResults, styleResults] = await Promise.all([
      db.$queryRawUnsafe(
        `SELECT DISTINCT "name" FROM "Beer" WHERE ${nameConditions.join(' OR ')} ORDER BY "rating" DESC LIMIT 5`,
        ...nameParams
      ) as Promise<Array<{ name: string }>>,
      db.$queryRawUnsafe(
        `SELECT DISTINCT "style" FROM "Beer" WHERE ${styleConditions.join(' OR ')} LIMIT 5`,
        ...styleParams
      ) as Promise<Array<{ style: string }>>,
    ]);

    return NextResponse.json({
      suggestions: nameResults.map((r) => r.name),
      styles: styleResults.map((r) => r.style),
    });
  } catch (error) {
    logger.error('Suggestions error', { error: String(error) });
    return NextResponse.json({ suggestions: [], styles: [] });
  }
}
