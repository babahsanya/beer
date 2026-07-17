import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Bilingual alias expansion: Russian substrings → English equivalents
const RU_EN_ALIASES: Record<string, string> = {
  стаут: 'stout',
  ипа: 'ipa',
  лагер: 'lager',
  эль: 'ale',
  пшеничн: 'wheat',
  бельгийск: 'belgian',
  американск: 'american',
  имперск: 'imperial',
  портер: 'porter',
  кислый: 'sour',
  трипель: 'tripel',
  пилснер: 'pilsner',
  вайсбир: 'witbier',
  'тёмн': 'dark',
  'тёмные': 'dark',
  креп: 'strong',
  рис: 'rice',
  фрукт: 'fruit',
  овсян: 'oatmeal',
  пале: 'pale',
  дабл: 'double',
  квдрупель: 'quadrupel',
  сезон: 'saison',
  кольш: 'kolsch',
  коьш: 'kolsch',
  лэмбик: 'lambic',
  сессион: 'session',
  виенн: 'vienna',
  советск: 'soviet',
  европейск: 'european',
  яг: 'ipa',
  стауд: 'stout',
};

// Extract English aliases from a Russian query
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

// Levenshtein distance between two strings
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
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[la][lb];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
    const sortBy = searchParams.get('sort') || 'rating';

    if (!q.trim()) {
      return NextResponse.json({
        beers: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    const qTrimmed = q.trim();
    const likePattern = `%${qTrimmed.toLowerCase()}%`;

    // Build bilingual expansion
    const englishAliases = expandAliases(qTrimmed);
    const aliasPatterns = englishAliases.map(
      (en) => `%${en.toLowerCase()}%`
    );

    // Build WHERE clause with all search fields + bilingual aliases + description
    const conditions: string[] = [
      'LOWER("name") LIKE ?',
      'LOWER("style") LIKE ?',
      'LOWER("brewery") LIKE ?',
      'LOWER("country") LIKE ?',
      'LOWER("description") LIKE ?',
    ];
    const params: unknown[] = [
      likePattern, likePattern, likePattern, likePattern, likePattern,
    ];

    // Add OR conditions for each English alias
    for (const ap of aliasPatterns) {
      conditions.push('LOWER("name") LIKE ?');
      params.push(ap);
      conditions.push('LOWER("style") LIKE ?');
      params.push(ap);
    }

    const whereClause = conditions.join(' OR ');

    // Determine sort order
    let orderClause = '"rating" DESC';
    if (sortBy === 'abv') orderClause = '"abv" DESC';
    if (sortBy === 'checkins') orderClause = '"totalCheckins" DESC';

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

    // Fuzzy fallback for NAME search only (when LIKE returns nothing)
    let fuzzyBeers: unknown[] = [];
    if (total === 0) {
      // More generous threshold: longer queries allow more edits
      const maxDist = Math.max(2, Math.floor(qTrimmed.length / 2));
      const queryLower = qTrimmed.toLowerCase();
      const allBeers = await db.$queryRawUnsafe(
        `SELECT * FROM "Beer"`
      ) as Array<Record<string, unknown>>;

      // Compute best fuzzy distance for each beer
      // Checks: full name, first word, and each word in the name
      const scored = allBeers.map((beer) => {
        const name = String(beer.name || '').toLowerCase();
        const words = name.split(/\s+/);
        const firstWord = words[0] || '';
        const minDist = Math.min(
          levenshtein(queryLower, name),
          levenshtein(queryLower, firstWord),
          ...words.map((w) => levenshtein(queryLower, w))
        );
        return { beer, dist: minDist };
      });

      const matched = scored.filter((s) => s.dist <= maxDist);
      matched.sort((a, b) => a.dist - b.dist);

      fuzzyBeers = matched.slice(offset, offset + limit).map((s) => s.beer);
      total = matched.length;
    }

    const finalBeers = total === 0 ? [] : (totalRaw ? beers : fuzzyBeers);

    // Log search to history
    await db.searchHistory.create({
      data: {
        query: qTrimmed,
        resultCount: total,
      },
    });

    return NextResponse.json({
      beers: finalBeers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + (finalBeers as unknown[]).length < total,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Ошибка при поиске пива' },
      { status: 500 }
    );
  }
}
