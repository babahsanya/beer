/**
 * Untappd API v4 Client — https://untappd.com/api/docs
 *
 * Real beer data: ratings, checkins, labels, breweries, styles.
 * Requires UNTAPPD_CLIENT_ID and UNTAPPD_CLIENT_SECRET env vars.
 *
 * Rate limit: 100 requests/hour per application (we cache aggressively).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UntappdBrewery {
  brewery_id: number;
  brewery_name: string;
  brewery_label: string;
  brewery_slug: string;
  country_name: string;
  contact?: {
    url?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  location?: {
    brewery_city: string;
    brewery_state: string;
    lat: number;
    lng: number;
  };
}

export interface UntappdBeer {
  bid: number;
  beer_name: string;
  beer_label: string;
  beer_style: string;
  beer_abv: number;
  beer_ibu: number | null;
  beer_description: string;
  created_at: string;
  rating_score: number;
  rating_count: number;
  is_in_production: number;
  beer_slug: string;
}

export interface UntappdBeerItem {
  beer: UntappdBeer;
  brewery: UntappdBrewery;
  checkins: number;
  your_count?: number;
  recent_checkins?: Array<{
    checkin_id: number;
    created_at: string;
    rating_score: number;
    comment: string;
    user: {
      uid: number;
      user_name: string;
      user_avatar: string;
      is_private: number;
    };
  }>;
}

export interface UntappdSearchResponse {
  response: {
    beers: {
      count: number;
      items: UntappdBeerItem[];
      type: string;
    };
  };
}

export interface UntappdBeerInfoResponse {
  response: {
    beer: UntappdBeerItem;
  };
}

export interface UntappdBrewerySearchResponse {
  response: {
    breweries: {
      count: number;
      items: Array<{
        brewery: UntappdBrewery & {
          brewery_type?: string;
          rating_score?: number;
          rating_count?: number;
          total_count?: number;
          beer_count?: number;
        };
      }>;
    };
  };
}

export interface UntappdCheckinsResponse {
  response: {
    checkins: {
      count: number;
      items: Array<{
        checkin_id: number;
        created_at: string;
        rating_score: number;
        comment: string;
        user: {
          uid: number;
          user_name: string;
          user_avatar: string;
        };
        beer: UntappdBeer;
        brewery: UntappdBrewery;
        venue?: {
          venue_id: number;
          venue_name: string;
          primary_category: string;
          location: {
            venue_city: string;
            venue_state: string;
            venue_country: string;
            lat: number;
            lng: number;
          };
        };
      }>;
      max_page_id?: number;
    };
  };
}

// Our normalized beer format
export interface NormalizedBeer {
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
  // Untappd-specific extras
  untappdId?: number;
  breweryId?: number;
  breweryLabel?: string;
  breweryUrl?: string;
  isProduction?: boolean;
  foodPairing?: string[];
  brewersTips?: string;
}

// ─── Client ──────────────────────────────────────────────────────────────────

const UNTAPPD_BASE = 'https://api.untappd.com/v4';

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.UNTAPPD_CLIENT_ID;
  const clientSecret = process.env.UNTAPPD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'UNTAPPD_CLIENT_ID и UNTAPPD_CLIENT_SECRET не заданы. ' +
      'Зарегистрируйте приложение на https://untappd.com/api/docs и задайте переменные окружения.'
    );
  }

  return { clientId, clientSecret };
}

function authParams(): string {
  const { clientId, clientSecret } = getCredentials();
  return `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;
}

/**
 * Check if Untappd API is configured and reachable.
 */
let _availableCheck: boolean | null = null;
let _availableCheckTime = 0;

export async function isUntappdAvailable(): Promise<boolean> {
  // Cache check for 5 minutes
  if (_availableCheck !== null && Date.now() - _availableCheckTime < 300_000) {
    return _availableCheck;
  }

  if (!process.env.UNTAPPD_CLIENT_ID || !process.env.UNTAPPD_CLIENT_SECRET) {
    _availableCheck = false;
    _availableCheckTime = Date.now();
    return false;
  }

  try {
    const res = await fetch(
      `${UNTAPPD_BASE}/search/beer?q=test&limit=1&${authParams()}`,
      { signal: AbortSignal.timeout(8000) }
    );
    _availableCheck = res.ok;
    _availableCheckTime = Date.now();
    return _availableCheck;
  } catch {
    _availableCheck = false;
    _availableCheckTime = Date.now();
    return false;
  }
}

/**
 * Search beers on Untappd.
 */
export async function searchBeers(
  query: string,
  limit = 20,
  offset = 0
): Promise<UntappdBeerItem[]> {
  if (!(await isUntappdAvailable())) return [];

  try {
    const params = new URLSearchParams({
      q: query.slice(0, 200),
      limit: String(Math.min(limit, 50)),
      offset: String(offset),
      sort: 'score', // sort by relevance
    });

    const res = await fetch(
      `${UNTAPPD_BASE}/search/beer?${params.toString()}&${authParams()}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[Untappd] search/beer ${res.status}: ${errBody.slice(0, 200)}`);
      return [];
    }

    const data = (await res.json()) as UntappdSearchResponse;
    return data?.response?.beers?.items || [];
  } catch (err) {
    console.error('[Untappd] searchBeers error:', (err as Error).message);
    return [];
  }
}

/**
 * Get detailed info about a beer.
 */
export async function getBeerInfo(beerId: number): Promise<UntappdBeerItem | null> {
  if (!(await isUntappdAvailable())) return null;

  try {
    const res = await fetch(
      `${UNTAPPD_BASE}/beer/info/${beerId}?${authParams()}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as UntappdBeerInfoResponse;
    return data?.response?.beer || null;
  } catch {
    return null;
  }
}

/**
 * Get recent checkins for a beer.
 */
export async function getBeerCheckins(
  beerId: number,
  limit = 25
): Promise<UntappdCheckinsResponse['response']['checkins']['items']> {
  if (!(await isUntappdAvailable())) return [];

  try {
    const res = await fetch(
      `${UNTAPPD_BASE}/beer/checkins/${beerId}?limit=${Math.min(limit, 100)}&${authParams()}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) return [];

    const data = (await res.json()) as UntappdCheckinsResponse;
    return data?.response?.checkins?.items || [];
  } catch {
    return [];
  }
}

/**
 * Search breweries on Untappd.
 */
export async function searchBreweries(
  query: string,
  limit = 20,
  offset = 0
): Promise<UntappdBrewerySearchResponse['response']['breweries']['items']> {
  if (!(await isUntappdAvailable())) return [];

  try {
    const params = new URLSearchParams({
      q: query.slice(0, 200),
      limit: String(Math.min(limit, 50)),
      offset: String(offset),
    });

    const res = await fetch(
      `${UNTAPPD_BASE}/search/brewery?${params.toString()}&${authParams()}`,
      { signal: AbortSignal.timeout(15000) }
    );

    if (!res.ok) return [];

    const data = (await res.json()) as UntappdBrewerySearchResponse;
    return data?.response?.breweries?.items || [];
  } catch {
    return [];
  }
}

/**
 * Get detailed info about a brewery.
 */
export async function getBreweryInfo(
  breweryId: number
): Promise<UntappdBrewery & { brewery_type?: string; rating_score?: number; beer_count?: number } | null> {
  if (!(await isUntappdAvailable())) return null;

  try {
    const res = await fetch(
      `${UNTAPPD_BASE}/brewery/info/${breweryId}?${authParams()}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) return null;

    const data = await res.json() as { response: { brewery: UntappdBrewery & { brewery_type?: string; rating_score?: number; beer_count?: number } } };
    return data?.response?.brewery || null;
  } catch {
    return null;
  }
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

/**
 * Normalize an Untappd beer item into our standard Beer format.
 */
export function normalizeUntappdBeer(item: UntappdBeerItem): NormalizedBeer {
  const beer = item.beer;
  const brewery = item.brewery;

  return {
    id: `untappd-${beer.bid}`,
    name: beer.beer_name,
    style: beer.beer_style || 'Неизвестный стиль',
    abv: beer.beer_abv || 0,
    ibu: beer.beer_ibu || 0,
    country: brewery.country_name || '',
    brewery: brewery.brewery_name || '',
    description: (beer.beer_description || '').slice(0, 2000),
    label: beer.beer_label || '',
    rating: beer.rating_score || 0,
    ratingCount: beer.rating_count || 0,
    totalCheckins: item.checkins || 0,
    // Untappd doesn't give monthly/daily, but we can estimate
    monthlyCheckins: Math.round((item.checkins || 0) / 36),  // ~3 years avg
    dailyCheckins: Math.round((item.checkins || 0) / 1095),
    source: 'untappd',
    _source: 'online',
    // Extra Untappd data
    untappdId: beer.bid,
    breweryId: brewery.brewery_id,
    breweryLabel: brewery.brewery_label || '',
    breweryUrl: brewery.contact?.url || '',
    isProduction: beer.is_in_production === 1,
  };
}

/**
 * Normalize a list of Untappd beer items.
 */
export function normalizeUntappdBeers(items: UntappdBeerItem[]): NormalizedBeer[] {
  return items.map(normalizeUntappdBeer);
}

/**
 * Country name to Russian + flag emoji.
 */
const COUNTRY_MAP: Record<string, string> = {
  'United States': '🇺🇸 США',
  'Belgium': '🇧🇪 Бельгия',
  'Germany': '🇩🇪 Германия',
  'United Kingdom': '🇬🇧 Великобритания',
  'Czech Republic': '🇨🇿 Чехия',
  'Netherlands': '🇳🇱 Нидерланды',
  'Ireland': '🇮🇪 Ирландия',
  'Denmark': '🇩🇰 Дания',
  'Japan': '🇯🇵 Япония',
  'Australia': '🇦🇺 Австралия',
  'Norway': '🇳🇴 Норвегия',
  'Sweden': '🇸🇪 Швеция',
  'Canada': '🇨🇦 Канада',
  'Italy': '🇮🇹 Италия',
  'France': '🇫🇷 Франция',
  'Poland': '🇵🇱 Польша',
  'Brazil': '🇧🇷 Бразилия',
  'Mexico': '🇲🇽 Мексика',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Шотландия',
  'South Korea': '🇰🇷 Южная Корея',
  'New Zealand': '🇳🇿 Новая Зеландия',
  'Argentina': '🇦🇷 Аргентина',
  'Thailand': '🇹🇭 Таиланд',
  'Spain': '🇪🇸 Испания',
  'Portugal': '🇵🇹 Португалия',
  'Austria': '🇦🇹 Австрия',
  'Switzerland': '🇨🇭 Швейцария',
  'Russia': '🇷🇺 Россия',
  'Finland': '🇫🇮 Финляндия',
  'India': '🇮🇳 Индия',
  'China': '🇨🇳 Китай',
  'South Africa': '🇿🇦 ЮАР',
  'Chile': '🇨🇱 Чили',
  'Colombia': '🇨🇴 Колумбия',
  'Philippines': '🇵🇭 Филиппины',
  'Vietnam': '🇻🇳 Вьетнам',
  'Croatia': '🇭🇷 Хорватия',
  'Romania': '🇷🇴 Румыния',
  'Hungary': '🇭🇺 Венгрия',
  'Greece': '🇬🇷 Греция',
  'Turkey': '🇹🇷 Турция',
  'Israel': '🇮🇱 Израиль',
  'Singapore': '🇸🇬 Сингапур',
  'Taiwan': '🇹🇼 Тайвань',
  'Estonia': '🇪🇪 Эстония',
  'Latvia': '🇱🇻 Латвия',
  'Lithuania': '🇱🇹 Литва',
  'Ukraine': '🇺🇦 Украина',
  'Belarus': '🇧🇾 Беларусь',
  'Georgia': '🇬🇪 Грузия',
  'Armenia': '🇦🇲 Армения',
  'Kazakhstan': '🇰🇿 Казахстан',
  'Iceland': '🇮🇸 Исландия',
  'Jamaica': '🇯🇲 Ямайка',
  'Dominican Republic': '🇩🇴 Доминикана',
  'Costa Rica': '🇨🇷 Коста-Рика',
  'Panama': '🇵🇦 Панама',
  'Nicaragua': '🇳🇮 Никарагуа',
  'Cuba': '🇨🇺 Куба',
  'Peru': '🇵🇪 Перу',
  'Ecuador': '🇪🇨 Эквадор',
  'Uruguay': '🇺🇾 Уругвай',
  'Paraguay': '🇵🇾 Парагвай',
  'Venezuela': '🇻🇪 Венесуэла',
  'Nigeria': '🇳🇬 Нигерия',
  'Kenya': '🇰🇪 Кения',
  'Ghana': '🇬🇭 Гана',
  'Egypt': '🇪🇬 Египет',
  'Morocco': '🇲🇦 Марокко',
  'Serbia': '🇷🇸 Сербия',
  'Bulgaria': '🇧🇬 Болгария',
  'Slovakia': '🇸🇰 Словакия',
  'Slovenia': '🇸🇮 Словения',
  'Czechia': '🇨🇿 Чехия',
};

export function localizeCountry(countryName: string): string {
  if (!countryName) return '🌍 Неизвестно';

  // Direct lookup
  if (COUNTRY_MAP[countryName]) return COUNTRY_MAP[countryName];

  // Case-insensitive fallback
  const lower = countryName.toLowerCase();
  for (const [en, localized] of Object.entries(COUNTRY_MAP)) {
    if (en.toLowerCase() === lower) return localized;
  }

  // Partial match
  for (const [en, localized] of Object.entries(COUNTRY_MAP)) {
    if (lower.includes(en.toLowerCase()) || en.toLowerCase().includes(lower)) {
      return localized;
    }
  }

  return `🌍 ${countryName}`;
}

// ─── In-memory cache for API responses (respecting Untappd's 100 req/hour) ───

const searchCache = new Map<string, { items: UntappdBeerItem[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Search beers with caching.
 */
export async function searchBeersCached(
  query: string,
  limit = 20,
  offset = 0
): Promise<UntappdBeerItem[]> {
  const cacheKey = `${query.toLowerCase().trim()}:${limit}:${offset}`;
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.items;
  }

  const items = await searchBeers(query, limit, offset);
  searchCache.set(cacheKey, { items, timestamp: Date.now() });

  // Prune old cache entries (keep max 200)
  if (searchCache.size > 200) {
    const entries = Array.from(searchCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (const [key] of entries.slice(0, entries.length - 200)) {
      searchCache.delete(key);
    }
  }

  return items;
}

const breweryCache = new Map<string, { items: UntappdBrewerySearchResponse['response']['breweries']['items']; timestamp: number }>();

/**
 * Search breweries with caching.
 */
export async function searchBreweriesCached(
  query: string,
  limit = 20,
  offset = 0
): Promise<UntappdBrewerySearchResponse['response']['breweries']['items']> {
  const cacheKey = `brew:${query.toLowerCase().trim()}:${limit}:${offset}`;
  const cached = breweryCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.items;
  }

  const items = await searchBreweries(query, limit, offset);
  breweryCache.set(cacheKey, { items, timestamp: Date.now() });

  if (breweryCache.size > 100) {
    const entries = Array.from(breweryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (const [key] of entries.slice(0, entries.length - 100)) {
      breweryCache.delete(key);
    }
  }

  return items;
}