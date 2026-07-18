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
  дозер: 'dozer',
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

// --- LOCAL DATABASE SEARCH ---

async function searchLocal(
  qTrimmed: string,
  limit: number,
  offset: number,
  sortBy: string
): Promise<{ beers: Record<string, unknown>[]; total: number }> {
  const likePattern = `%${qTrimmed.toLowerCase()}%`;

  // Build bilingual expansion
  const englishAliases = expandAliases(qTrimmed);
  const aliasPatterns = englishAliases.map(
    (en) => `%${en.toLowerCase()}%`
  );

  // Build WHERE clause with all search fields + bilingual aliases
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

  for (const ap of aliasPatterns) {
    conditions.push('LOWER("name") LIKE ?');
    params.push(ap);
    conditions.push('LOWER("style") LIKE ?');
    params.push(ap);
  }

  const whereClause = conditions.join(' OR ');

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

  // Fuzzy fallback when LIKE returns nothing
  let fuzzyBeers: unknown[] = [];
  if (total === 0) {
    const maxDist = Math.max(2, Math.floor(qTrimmed.length / 2));
    const queryLower = qTrimmed.toLowerCase();
    const allBeers = await db.$queryRawUnsafe(
      `SELECT * FROM "Beer"`
    ) as Array<Record<string, unknown>>;

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
  return { beers: finalBeers as Record<string, unknown>[], total };
}

// --- WEB SEARCH + LLM PARSING ---

interface WebSearchResult {
  name?: string;
  url?: string;
  snippet?: string;
  host_name?: string;
}

interface ParsedBeer {
  name: string;
  style: string;
  abv: number;
  ibu: number;
  country: string;
  brewery: string;
  description: string;
  label: string;
  rating: number;
  ratingCount: number;
}

async function searchOnline(
  qTrimmed: string,
  limit: number
): Promise<ParsedBeer[]> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    // Step 1: Search the web for beer info
    const searchQuery = `beer ${qTrimmed} ABV style rating brewery`;
    const webResult = await zai.functions.invoke('web_search', {
      query: searchQuery,
    });

    // Handle both array format and {results: [...]} format
    const webItems: WebSearchResult[] = Array.isArray(webResult) ? webResult : (webResult?.results || []);
    if (webItems.length === 0) return [];

    // Step 2: Use LLM to parse search results into structured beer data
    const searchContext = webItems.slice(0, 10).map((item, i) => ({
      index: i + 1,
      title: item.name || item.url || '',
      snippet: item.snippet || '',
      url: item.url || '',
      host: item.host_name || '',
    }));


    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a beer database expert. Given web search results about beers, extract structured beer data.
Return ONLY valid JSON array (no markdown, no code blocks). Each beer must have:
- name: beer name (string)
- style: beer style like "IPA", "Stout", "Lager", etc. (string)
- abv: alcohol by volume percentage (number, 0 if unknown)
- ibu: international bitterness units (number, 0 if unknown)
- country: country of origin (string, empty if unknown)
- brewery: brewery name (string, empty if unknown)
- description: short description in Russian (string)
- label: empty string always
- rating: rating out of 5 (number, 0 if unknown)
- ratingCount: number of ratings (number, 0 if unknown)

IMPORTANT: 
- If the search results don't contain actual beer data, return empty array []
- Only include beers that clearly match the search query "${qTrimmed}"
- If ABV is mentioned as "5.0%" use 5.0
- Maximum ${limit} beers
- Do NOT hallucinate data - if info is not in search results, use 0/empty`
        },
        {
          role: 'user',
          content: `Search results for "${qTrimmed}":\n${JSON.stringify(searchContext, null, 2)}`
        }
      ],
      thinking: { type: 'disabled' },
    });

    const content = completion?.choices?.[0]?.message?.content || '';

    // Parse JSON from LLM response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed: ParsedBeer[] = JSON.parse(jsonStr);

    // Validate and clean
    return parsed
      .filter((b) => b.name && b.name.length > 1)
      .map((b) => ({
        name: b.name,
        style: b.style || '',
        abv: typeof b.abv === 'number' ? b.abv : 0,
        ibu: typeof b.ibu === 'number' ? b.ibu : 0,
        country: b.country || '',
        brewery: b.brewery || '',
        description: b.description || '',
        label: '',
        rating: typeof b.rating === 'number' ? Math.min(b.rating, 5) : 0,
        ratingCount: typeof b.ratingCount === 'number' ? b.ratingCount : 0,
      }));
  } catch (error) {
    console.error('[searchOnline] Error:', (error as Error).message);
    return [];
  }
}

// --- MAIN UNIFIED SEARCH ---

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
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

    // Run local + online search in parallel
    const [localResult, onlineBeers] = await Promise.all([
      searchLocal(qTrimmed, limit, offset, sortBy),
      noWeb ? Promise.resolve([]) : searchOnline(qTrimmed, limit),
    ]);

    const sources: string[] = [];
    if (localResult.total > 0) sources.push('local');
    if (onlineBeers.length > 0) sources.push('online');

    // Normalize local results
    const localNames = new Set<string>();
    const mergedBeers: Record<string, unknown>[] = [];

    for (const beer of localResult.beers) {
      const name = String(beer.name || '').toLowerCase().trim();
      localNames.add(name);
      // Add source indicator to local beers
      mergedBeers.push({
        ...beer,
        _source: 'local',
      });
    }

    // Append online results (deduplicate against local)
    let onlineOffset = 0;
    for (const ob of onlineBeers) {
      const name = ob.name.toLowerCase().trim();
      if (localNames.has(name)) continue;

      if (offset === 0 || mergedBeers.length < limit) {
        mergedBeers.push({
          id: `online-${ob.name.toLowerCase().replace(/\s+/g, '-')}-${onlineOffset}`,
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
          totalCheckins: 0,
          monthlyCheckins: 0,
          dailyCheckins: 0,
          source: 'online',
          _source: 'online',
        });
        onlineOffset++;
      }
    }

    const totalMerged = localResult.total + onlineBeers.filter(
      (ob) => !localNames.has(ob.name.toLowerCase().trim())
    ).length;

    // Log search to history
    try {
      await db.searchHistory.create({
        data: {
          query: qTrimmed,
          resultCount: mergedBeers.length,
        },
      });
    } catch {
      // Non-fatal
    }

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
    return NextResponse.json(
      { error: 'Ошибка при поиске пива' },
      { status: 500 }
    );
  }
}