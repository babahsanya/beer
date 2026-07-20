import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
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
import { apiSuccess, apiBadRequest, apiTooManyRequests, apiInternalError } from '@/lib/api';
import { escapeLike, expandAliases } from '@/lib/beer-aliases';
import { searchQuerySchema, paginationSchema, formatZodErrors } from '@/lib/validation';

// Two-row Levenshtein — O(min(la,lb)) memory instead of full O(la*lb) matrix.
// Identical distance result to the classic DP, just doesn't keep the whole
// matrix around. For our 500-row fuzzy fallback scan this is ~100x less
// memory pressure.
function levenshtein(a: string, b: string): number {
  // Ensure `a` is the shorter string so prev/cur arrays are smaller.
  if (a.length > b.length) [a, b] = [b, a];
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = new Array<number>(lb + 1);
  let cur = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    const aCh = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = aCh === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(
        prev[j] + 1,        // deletion
        cur[j - 1] + 1,    // insertion
        prev[j - 1] + cost // substitution
      );
    }
    // Swap prev and cur for the next iteration. Allocating a fresh array
    // each row would be wasteful, so we reuse the two buffers.
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[lb];
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

  // Fuzzy fallback — scan top-rated beers (ORDER BY rating DESC instead
  // of a random sample) so the fallback surfaces reasonable suggestions
  // when the LIKE clauses return zero rows.
  let fuzzyBeers: unknown[] = [];
  if (total === 0) {
    const maxDist = Math.max(2, Math.floor(qTrimmed.length / 2));
    const queryLower = qTrimmed.toLowerCase();
    const allBeers = await db.$queryRawUnsafe(
      `SELECT * FROM "Beer" ORDER BY "rating" DESC LIMIT ?`,
      MAX_FUZZY_SCAN,
    ) as Array<Record<string, unknown>>;
    // Filter out very short tokens — Levenshtein on "А" vs anything is noise.
    const wordFilter = (w: string) => w.length >= 2;
    let bestDist = Number.POSITIVE_INFINITY;
    const scored = allBeers.map(beer => {
      const name = String(beer.name || '').toLowerCase();
      const words = name.split(/\s+/).filter(wordFilter);
      const candidates = [name, words[0] || '', ...words];
      let minDist = Number.POSITIVE_INFINITY;
      for (const cand of candidates) {
        if (!cand) continue;
        const d = levenshtein(queryLower, cand);
        if (d < minDist) minDist = d;
        if (d === 0) break; // early-exit — can't beat a perfect match
      }
      if (minDist < bestDist) bestDist = minDist;
      return { beer, dist: minDist };
    });
    const matched = scored.filter(s => s.dist <= maxDist).sort((a, b) => a.dist - b.dist);
    fuzzyBeers = matched.slice(offset, offset + limit).map(s => s.beer);
    total = matched.length;
    void bestDist;
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
    logger.error('[searchOnlineOBD] error', { error: String(err) });
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
      logger.debug('[searchOnline] Untappd', { count: items.length, query: qTrimmed });
      return normalizeUntappdBeers(items) as unknown as Array<Record<string, unknown>>;
    }
  } catch (err) {
    logger.error('[searchOnline] Untappd error', { error: String(err) });
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
      return apiTooManyRequests(
        'Слишком много запросов. Подождите немного.',
        Math.ceil((searchCheck.resetAt - Date.now()) / 1000),
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const paginationResult = paginationSchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });
    if (!paginationResult.success) {
      return apiBadRequest(
        'Некорректные параметры',
        formatZodErrors(paginationResult.error),
      );
    }
    const { limit, offset } = paginationResult.data;

    const sortBy = searchParams.get('sort') || 'rating';
    const noWeb = searchParams.get('noweb') === 'true';

    const qRaw = searchParams.get('q') ?? '';
    if (qRaw.trim() === '') {
      return apiSuccess({
        beers: [], sources: [], pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    const qResult = searchQuerySchema.safeParse(qRaw);
    if (!qResult.success) {
      return apiBadRequest('Некорректный запрос', formatZodErrors(qResult.error));
    }
    const qTrimmed = qResult.data;

    if (!noWeb) {
      const aiCheck = aiLimiter(clientIp);
      if (!aiCheck.allowed) {
        const localResult = await searchLocal(qTrimmed, limit, offset, sortBy);
        return apiSuccess({
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

    return apiSuccess({
      beers: mergedBeers,
      sources,
      localCount: localResult.total,
      onlineCount: onlineResults.length,
      pagination: { total: totalMerged, limit, offset, hasMore: offset + mergedBeers.length < totalMerged },
    });
  } catch (error) {
    logger.error('Unified search error', { error: String(error) });
    return apiInternalError('Ошибка при поиске пива');
  }
}