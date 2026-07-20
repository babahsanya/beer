import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchLimiter, aiLimiter, getClientIp } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';
import {
  searchBeersCached,
  normalizeUntappdBeers,
  isUntappdAvailable,
} from '@/lib/untappd';
import {
  searchBreweriesCached,
  isAvailable as isOBDAvailable,
  getCountryFlag,
  localizeBreweryType,
} from '@/lib/brewerydb';

// Escape LIKE wildcards
function escapeLike(str: string): string {
  return str.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
}

// Russian → English aliases
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
  дюбель: 'dubbel', пивовар: 'brewery', пивоварен: 'brewery',
};

function expandAliases(query: string): string[] {
  const queryLower = query.toLowerCase();
  const terms = new Set<string>();
  for (const [ru, en] of Object.entries(RU_EN_ALIASES)) {
    if (queryLower.includes(ru) || ru.startsWith(queryLower)) {
      terms.add(en);
    }
  }
  return Array.from(terms);
}

function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  const m: number[][] = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) m[i][0] = i;
  for (let j = 0; j <= lb; j++) m[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    }
  }
  return m[la][lb];
}

// ─── LOCAL DATABASE SEARCH ──────────────────────────────────────────────────

const MAX_FUZZY_SCAN = 500;

async function searchLocal(
  qTrimmed: string, limit: number, offset: number, sortBy: string
): Promise<{ beers: Record<string, unknown>[]; total: number }> {
  const likePattern = `%${escapeLike(qTrimmed.toLowerCase())}%`;
  const englishAliases = expandAliases(qTrimmed);
  const aliasPatterns = englishAliases.map(en => `%${en.toLowerCase()}%`);
  const ESC = " ESCAPE '!'";

  const conditions: string[] = [
    `LOWER("name") LIKE ?${ESC}`, `LOWER("style") LIKE ?${ESC}`,
    `LOWER("brewery") LIKE ?${ESC}`, `LOWER("country") LIKE ?${ESC}`,
    `LOWER("description") LIKE ?${ESC}`,
  ];
  const params: unknown[] = [likePattern, likePattern, likePattern, likePattern, likePattern];

  for (const ap of aliasPatterns) {
    conditions.push(`LOWER("name") LIKE ?${ESC}`, `LOWER("style") LIKE ?${ESC}`);
    params.push(ap, ap);
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
    db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Beer" WHERE ${whereClause}`, ...params),
  ]);

  const totalRaw = (totalResult as Array<{ count: bigint | number }>)[0]?.count || 0;
  let total = Number(totalRaw);

  // Fuzzy fallback
  let fuzzyBeers: unknown[] = [];
  if (total === 0) {
    const maxDist = Math.max(2, Math.floor(qTrimmed.length / 2));
    const queryLower = qTrimmed.toLowerCase();
    const allBeers = await db.$queryRawUnsafe(`SELECT * FROM "Beer" LIMIT ?`, MAX_FUZZY_SCAN) as Array<Record<string, unknown>>;
    const scored = allBeers.map(beer => {
      const name = String(beer.name || '').toLowerCase();
      const words = name.split(/\s+/);
      const minDist = Math.min(
        levenshtein(queryLower, name),
        levenshtein(queryLower, words[0] || ''),
        ...words.map(w => levenshtein(queryLower, w))
      );
      return { beer, dist: minDist };
    });
    const matched = scored.filter(s => s.dist <= maxDist).sort((a, b) => a.dist - b.dist);
    fuzzyBeers = matched.slice(offset, offset + limit).map(s => s.beer);
    total = matched.length;
  }

  return {
    beers: (total === 0 ? [] : (totalRaw ? beers : fuzzyBeers)) as Record<string, unknown>[],
    total,
  };
}

// ─── ONLINE SEARCH: Open Brewery DB (free, no key) ─────────────────────────
// Returns "brewery" type results since OBD has breweries, not individual beers.

interface OBDResult {
  id: string;
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
  totalCheckins: number;
  monthlyCheckins: number;
  dailyCheckins: number;
  source: string;
  _source: string;
  _type: string;
  city: string;
  breweryType: string;
  website: string | null;
  lat: number | null;
  lng: number | null;
}

async function searchOnlineOBD(
  qTrimmed: string, limit: number
): Promise<OBDResult[]> {
  if (!(await isOBDAvailable())) return [];

  try {
    const breweries = await searchBreweriesCached(qTrimmed, limit);
    if (breweries.length === 0) {
      // Try English aliases
      const aliases = expandAliases(qTrimmed);
      for (const alias of aliases) {
        const results = await searchBreweriesCached(alias, limit);
        if (results.length > 0) {
          return results.map(breweryToResult);
        }
      }
      return [];
    }

    return breweries.map(breweryToResult);
  } catch (err) {
    console.error('[searchOnlineOBD] error:', (err as Error).message);
    return [];
  }
}

function breweryToResult(b: { id: string; name: string; brewery_type: string; city: string; country: string; website_url: string | null; latitude: number | null; longitude: number | null; phone: string | null; state_province: string; postal_code: string; street: string | null }): OBDResult {
  const cityState = [b.city, b.state_province].filter(Boolean).join(', ');
  const address = [b.street, b.postal_code].filter(Boolean).join(', ');
  const location = [address, cityState, b.country].filter(Boolean).join(' | ');

  return {
    id: `obd-${b.id}`,
    name: b.name,
    style: localizeBreweryType(b.brewery_type),
    abv: 0,
    ibu: 0,
    country: `${getCountryFlag(b.country)} ${b.country}`,
    brewery: b.name,
    description: location + (b.website_url ? `\n🌐 ${b.website_url}` : ''),
    label: '',
    rating: 0,
    ratingCount: 0,
    totalCheckins: 0,
    monthlyCheckins: 0,
    dailyCheckins: 0,
    source: 'openbrewerydb',
    _source: 'online',
    _type: 'brewery',
    city: b.city,
    breweryType: b.brewery_type,
    website: b.website_url,
    lat: b.latitude,
    lng: b.longitude,
  };
}

// ─── ONLINE SEARCH: Untappd (optional, requires API key) ────────────────────

async function searchOnlineUntappd(
  qTrimmed: string, limit: number
): Promise<Array<Record<string, unknown>>> {
  if (!(await isUntappdAvailable())) return [];

  try {
    const items = await searchBeersCached(qTrimmed, limit);
    if (items.length > 0) {
      console.warn(`[searchOnline] Untappd: ${items.length} results for "${qTrimmed}"`);
      return normalizeUntappdBeers(items) as unknown as Array<Record<string, unknown>>;
    }
  } catch (err) {
    console.error('[searchOnline] Untappd error:', (err as Error).message);
  }

  // Try English aliases
  const aliases = expandAliases(qTrimmed);
  for (const alias of aliases) {
    try {
      const items = await searchBeersCached(alias, limit);
      if (items.length > 0) {
        return normalizeUntappdBeers(items) as unknown as Array<Record<string, unknown>>;
      }
    } catch { continue; }
  }

  return [];
}

// ─── MAIN UNIFIED SEARCH ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const searchCheck = searchLimiter(clientIp);
    if (!searchCheck.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Подождите немного.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((searchCheck.resetAt - Date.now()) / 1000)) } }
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
      return NextResponse.json({ beers: [], sources: [], pagination: { total: 0, limit, offset, hasMore: false } });
    }

    const qTrimmed = q.trim();

    if (!noWeb) {
      const aiCheck = aiLimiter(clientIp);
      if (!aiCheck.allowed) {
        const localResult = await searchLocal(qTrimmed, limit, offset, sortBy);
        return NextResponse.json({
          beers: localResult.beers.map(b => ({ ...b, _source: 'local' })),
          sources: localResult.total > 0 ? ['local'] : [],
          localCount: localResult.total, onlineCount: 0,
          pagination: { total: localResult.total, limit, offset, hasMore: offset + localResult.beers.length < localResult.total },
          rateLimited: true,
        });
      }
    }

    // Local search always runs
    const localResult = await searchLocal(qTrimmed, limit, offset, sortBy);

    // Online search: Untappd (if configured) OR Open Brewery DB (always available)
    let onlineResults: Array<Record<string, unknown>> = [];
    let onlineSource = '';

    if (!noWeb) {
      // Priority 1: Untappd (real beer data with ratings)
      const untappdResults = await searchOnlineUntappd(qTrimmed, limit);
      if (untappdResults.length > 0) {
        onlineResults = untappdResults;
        onlineSource = 'untappd';
      }

      // Priority 2: Open Brewery DB (brewery search, no key needed)
      if (onlineResults.length === 0) {
        const obdResults = await searchOnlineOBD(qTrimmed, limit);
        if (obdResults.length > 0) {
          onlineResults = obdResults as unknown as Array<Record<string, unknown>>;
          onlineSource = 'openbrewerydb';
        }
      }
    }

    const sources: string[] = [];
    if (localResult.total > 0) sources.push('local');
    if (onlineResults.length > 0) sources.push(onlineSource || 'online');

    const localNames = new Set<string>();
    const mergedBeers: Record<string, unknown>[] = [];

    for (const beer of localResult.beers) {
      const name = String(beer.name || '').toLowerCase().trim();
      localNames.add(name);
      mergedBeers.push({ ...beer, _source: 'local' });
    }

    for (const ob of onlineResults) {
      const name = String(ob.name || '').toLowerCase().trim();
      // For OBD breweries, also deduplicate by brewery name
      const breweryName = String(ob.brewery || '').toLowerCase().trim();
      if (localNames.has(name) || localNames.has(breweryName)) continue;

      if (offset === 0 || mergedBeers.length < limit) {
        mergedBeers.push({
          id: ob.id || `online-${name.replace(/\s+/g, '-')}`,
          name: ob.name,
          style: ob.style,
          abv: ob.abv || 0,
          ibu: ob.ibu || 0,
          country: ob.country,
          brewery: ob.brewery,
          description: ob.description,
          label: ob.label || '',
          rating: ob.rating || 0,
          ratingCount: ob.ratingCount || 0,
          totalCheckins: ob.totalCheckins || 0,
          monthlyCheckins: ob.monthlyCheckins || 0,
          dailyCheckins: ob.dailyCheckins || 0,
          source: onlineSource || 'online',
          _source: 'online',
          _type: ob._type || 'beer',
          ...(ob.city ? { city: ob.city } : {}),
          ...(ob.breweryType ? { breweryType: ob.breweryType } : {}),
          ...(ob.website ? { website: ob.website } : {}),
          ...(ob.lat ? { lat: ob.lat } : {}),
          ...(ob.lng ? { lng: ob.lng } : {}),
          ...(ob.untappdId ? { untappdId: ob.untappdId } : {}),
          ...(ob.breweryId ? { breweryId: ob.breweryId } : {}),
          ...(ob.breweryLabel ? { breweryLabel: ob.breweryLabel } : {}),
          ...(ob.breweryUrl ? { breweryUrl: ob.breweryUrl } : {}),
          ...(ob.isProduction !== undefined ? { isProduction: ob.isProduction } : {}),
        });
      }
    }

    const totalMerged = localResult.total + onlineResults.filter(
      ob => {
        const name = String(ob.name || '').toLowerCase().trim();
        const breweryName = String(ob.brewery || '').toLowerCase().trim();
        return !localNames.has(name) && !localNames.has(breweryName);
      }
    ).length;

    // Only record search history for authenticated users (Stage 2: SearchHistory
    // became user-scoped, so anonymous searches can no longer be persisted).
    try {
      const session = await auth();
      if (session?.user?.id) {
        await db.searchHistory.create({
          data: {
            userId: session.user.id,
            query: qTrimmed.slice(0, 200),
            resultCount: mergedBeers.length,
          },
        });
      }
    } catch { /* non-fatal */ }

    return NextResponse.json({
      beers: mergedBeers,
      sources,
      localCount: localResult.total,
      onlineCount: onlineResults.length,
      pagination: { total: totalMerged, limit, offset, hasMore: offset + mergedBeers.length < totalMerged },
    });
  } catch (error) {
    console.error('Unified search error:', error);
    return NextResponse.json({ error: 'Ошибка при поиске пива' }, { status: 500 });
  }
}