// Server-side only Untappd API client
// Uses client_id + client_secret (app credentials, NOT user OAuth)
// Falls back to null when credentials not configured (caller uses fallback)

import type { Beer } from '@/types/beer';

const UNTAPPD_BASE = 'https://api.untappd.com/v4';
const USER_AGENT = 'BeerID/1.0 (beer-app; server-side)';

interface UntappdConfig {
  clientId: string;
  clientSecret: string;
}

function getConfig(): UntappdConfig | null {
  const clientId = process.env.UNTAPPD_CLIENT_ID;
  const clientSecret = process.env.UNTAPPD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// --- Raw Untappd API response types ---

interface UntappdBeerItem {
  bid: number;
  beer_name: string;
  beer_label: string;
  beer_style: string;
  beer_abv: number;
  beer_ibu: number;
  beer_description: string;
  rating_score: number;
  rating_count: number;
  count: number; // total checkins
  monthly_count: number;
  weekly_count: number;
  brewery?: {
    brewery_name: string;
    brewery_country: string;
    brewery_city?: string;
    brewery_state?: string;
    brewery_label?: string;
  };
}

interface UntappdResponse<T> {
  meta: {
    code: number;
    response_time: number;
  };
  response: T;
}

interface UntappdSearchResponse {
  beers: {
    count: number;
    items: Array<{
      beer: UntappdBeerItem;
    }>;
  };
}

interface UntappdBeerInfoResponse {
  beer: UntappdBeerItem;
}

interface UntappdTrendingResponse {
  beers: {
    count: number;
    items: Array<{
      beer: UntappdBeerItem;
    }>;
  };
}

// --- Normalization ---

function normalizeUntappdBeer(item: UntappdBeerItem): Beer {
  return {
    id: `untappd-${item.bid}`,
    name: item.beer_name || 'Unknown Beer',
    style: item.beer_style || 'Unknown Style',
    abv: item.beer_abv || 0,
    ibu: item.beer_ibu || 0,
    country: item.brewery?.brewery_country || '',
    brewery: item.brewery?.brewery_name || '',
    description: item.beer_description || '',
    label: item.beer_label || '',
    rating: item.rating_score || 0,
    ratingCount: item.rating_count || 0,
    totalCheckins: item.count || 0,
    monthlyCheckins: item.monthly_count || 0,
    dailyCheckins: item.weekly_count ? Math.round(item.weekly_count / 7) : 0,
    source: 'untappd',
  };
}

// --- Public API ---

export interface UntappdSearchResult {
  beers: Beer[];
  total: number;
}

export interface UntappdBeerResult {
  beer: Beer | null;
}

export interface UntappdTrendingResult {
  beers: Beer[];
  total: number;
}

// Search beers via Untappd API
export async function searchUntappdBeers(
  query: string,
  limit = 10,
  offset = 0
): Promise<UntappdSearchResult | null> {
  const config = getConfig();
  if (!config) return null;

  try {
    const url = new URL(`${UNTAPPD_BASE}/search/beer`);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('client_secret', config.clientSecret);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Untappd search error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as UntappdResponse<UntappdSearchResponse>;

    if (data.meta.code !== 200) {
      console.error(`Untappd search meta error: ${data.meta.code}`);
      return null;
    }

    const items = data.response.beers?.items || [];
    const beers = items.map((item) => normalizeUntappdBeer(item.beer));

    return {
      beers,
      total: data.response.beers?.count || beers.length,
    };
  } catch (error) {
    console.error('Untappd search fetch error:', error);
    return null;
  }
}

// Get beer info via Untappd API
export async function getUntappdBeerInfo(
  bid: number
): Promise<UntappdBeerResult | null> {
  const config = getConfig();
  if (!config) return null;

  try {
    const url = new URL(`${UNTAPPD_BASE}/beer/info/${bid}`);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('client_secret', config.clientSecret);

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Untappd beer info error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as UntappdResponse<UntappdBeerInfoResponse>;

    if (data.meta.code !== 200) {
      console.error(`Untappd beer info meta error: ${data.meta.code}`);
      return null;
    }

    return {
      beer: normalizeUntappdBeer(data.response.beer),
    };
  } catch (error) {
    console.error('Untappd beer info fetch error:', error);
    return null;
  }
}

// Get trending beers via Untappd API
export async function getUntappdTrending(
  limit = 10
): Promise<UntappdTrendingResult | null> {
  const config = getConfig();
  if (!config) return null;

  try {
    const url = new URL(`${UNTAPPD_BASE}/beer/trending`);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('client_secret', config.clientSecret);
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`Untappd trending error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as UntappdResponse<UntappdTrendingResponse>;

    if (data.meta.code !== 200) {
      console.error(`Untappd trending meta error: ${data.meta.code}`);
      return null;
    }

    const items = data.response.beers?.items || [];
    const beers = items.map((item) => normalizeUntappdBeer(item.beer));

    return {
      beers,
      total: data.response.beers?.count || beers.length,
    };
  } catch (error) {
    console.error('Untappd trending fetch error:', error);
    return null;
  }
}