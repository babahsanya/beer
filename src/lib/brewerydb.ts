/**
 * Open Brewery DB client — free, no auth, no API key.
 * https://www.openbrewerydb.org/documentation
 *
 * Note: This is a BREWERY database, not a beer database.
 * It has brewery names, locations, types, and websites —
 * but NOT individual beers, ratings, ABV, IBU, or labels.
 *
 * We use it as the primary online search source (no key needed)
 * and supplement with Untappd when credentials are configured.
 */

export interface Brewery {
  id: string;
  name: string;
  brewery_type: string;
  address_1: string | null;
  address_2: string | null;
  address_3: string | null;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  longitude: number | null;
  latitude: number | null;
  phone: string | null;
  website_url: string | null;
  state: string | null;
  street: string | null;
}

const API_BASE = 'https://api.openbrewerydb.org/v1';

// ─── Availability check ──────────────────────────────────────────────────────

let _available: boolean | null = null;
let _availableTime = 0;

export async function isAvailable(): Promise<boolean> {
  if (_available !== null && Date.now() - _availableTime < 300_000) return _available;
  try {
    const res = await fetch(`${API_BASE}/breweries?per_page=1`, {
      signal: AbortSignal.timeout(8000),
    });
    _available = res.ok;
    _availableTime = Date.now();
    return _available;
  } catch {
    _available = false;
    _availableTime = Date.now();
    return false;
  }
}

// ─── Brewery search (by_name, by_country, by_city, by_state, by_type) ───────

export async function searchBreweries(options: {
  country?: string;
  city?: string;
  name?: string;
  state?: string;
  type?: string;
  perPage?: number;
  page?: number;
}): Promise<Brewery[]> {
  const params = new URLSearchParams();
  if (options.country) params.set('by_country', options.country);
  if (options.city) params.set('by_city', options.city);
  if (options.name) params.set('by_name', options.name);
  if (options.state) params.set('by_state', options.state);
  if (options.type) params.set('by_type', options.type);
  params.set('per_page', String(Math.min(options.perPage || 20, 200)));
  if (options.page) params.set('page', String(options.page));

  try {
    const res = await fetch(`${API_BASE}/breweries?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return (await res.json()) as Brewery[];
  } catch {
    return [];
  }
}

// ─── Full-text search endpoint ────────────────────────────────────────────────

export async function searchBreweriesByText(
  query: string,
  perPage = 15
): Promise<Brewery[]> {
  try {
    const params = new URLSearchParams({
      query: query.slice(0, 200),
      per_page: String(Math.min(perPage, 200)),
    });

    const res = await fetch(`${API_BASE}/breweries/search?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return (await res.json()) as Brewery[];
  } catch {
    return [];
  }
}

// ─── Autocomplete ─────────────────────────────────────────────────────────────

export async function autocompleteBreweries(
  query: string,
  perPage = 10
): Promise<Array<{ id: string; name: string }>> {
  try {
    const params = new URLSearchParams({
      query: query.slice(0, 200),
      per_page: String(Math.min(perPage, 50)),
    });

    const res = await fetch(`${API_BASE}/breweries/autocomplete?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return (await res.json()) as Array<{ id: string; name: string }>;
  } catch {
    return [];
  }
}

// ─── Single brewery ───────────────────────────────────────────────────────────

export async function getBrewery(id: string): Promise<Brewery | null> {
  try {
    const res = await fetch(`${API_BASE}/breweries/${id}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Brewery;
  } catch {
    return null;
  }
}

// ─── Breweries with coordinates for map ───────────────────────────────────────

export async function getBreweriesForMap(): Promise<Array<{
  id: string;
  name: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  breweryType: string;
  website: string | null;
}>> {
  const countries = [
    { name: 'United States', code: 'US' },
    { name: 'Belgium', code: 'BE' },
    { name: 'Germany', code: 'DE' },
    { name: 'United Kingdom', code: 'GB' },
    { name: 'Czech Republic', code: 'CZ' },
    { name: 'Netherlands', code: 'NL' },
    { name: 'Ireland', code: 'IE' },
    { name: 'Denmark', code: 'DK' },
    { name: 'Japan', code: 'JP' },
    { name: 'Australia', code: 'AU' },
  ];

  const results = await Promise.allSettled(
    countries.map(c => searchBreweries({ country: c.name, perPage: 10 }))
  );

  const breweries: Array<{
    id: string;
    name: string;
    country: string;
    city: string;
    lat: number;
    lng: number;
    breweryType: string;
    website: string | null;
  }> = [];

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const b of result.value) {
      if (b.latitude && b.longitude) {
        breweries.push({
          id: b.id,
          name: b.name,
          country: b.country,
          city: b.city,
          lat: b.latitude,
          lng: b.longitude,
          breweryType: b.brewery_type,
          website: b.website_url,
        });
      }
    }
  }

  return breweries;
}

// ─── Brewery type → Russian translation ──────────────────────────────────────

const BREWERY_TYPES_RU: Record<string, string> = {
  micro: 'Микропивоварня',
  nano: 'Нанопивоварня',
  regional: 'Региональная',
  brewpub: 'Паб-пивоварня',
  large: 'Крупная',
  planning: 'В планах',
  proprietor: 'Частная',
  contract: 'Контрактная',
  closed: 'Закрыта',
  bar: 'Бар',
  taproom: 'Тапрум',
  'beer garden': 'Пивной сад',
  beverage: 'Напитки',
  cidery: 'Сидерия',
  meadery: 'Медоварня',
  combination: 'Комбинированная',
  none: 'Не указано',
};

export function localizeBreweryType(type: string): string {
  return BREWERY_TYPES_RU[type.toLowerCase()] || type;
}

// ─── Country flags ───────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸', 'Belgium': '🇧🇪', 'Germany': '🇩🇪',
  'United Kingdom': '🇬🇧', 'Czech Republic': '🇨🇿', 'Netherlands': '🇳🇱',
  'Ireland': '🇮🇪', 'Denmark': '🇩🇰', 'Japan': '🇯🇵', 'Australia': '🇦🇺',
  'Norway': '🇳🇴', 'Sweden': '🇸🇪', 'Canada': '🇨🇦', 'Italy': '🇮🇹',
  'France': '🇫🇷', 'Poland': '🇵🇱', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'South Korea': '🇰🇷', 'New Zealand': '🇳🇿',
  'Argentina': '🇦🇷', 'Thailand': '🇹🇭', 'Spain': '🇪🇸', 'Portugal': '🇵🇹',
  'Austria': '🇦🇹', 'Switzerland': '🇨🇭', 'Russia': '🇷🇺', 'Finland': '🇫🇮',
  'Iceland': '🇮🇸', 'South Africa': '🇿🇦', 'Chile': '🇨🇱', 'Colombia': '🇨🇴',
  'India': '🇮🇳', 'China': '🇨🇳', 'Singapore': '🇸🇬', 'Taiwan': '🇹🇼',
  'Estonia': '🇪🇪', 'Latvia': '🇱🇻', 'Lithuania': '🇱🇹', 'Ukraine': '🇺🇦',
  'Croatia': '🇭🇷', 'Romania': '🇷🇴', 'Hungary': '🇭🇺', 'Greece': '🇬🇷',
  'Turkey': '🇹🇷', 'Israel': '🇮🇱', 'Jamaica': '🇯🇲', 'Dominican Republic': '🇩🇴',
  'Costa Rica': '🇨🇷', 'Panama': '🇵🇦', 'Peru': '🇵🇪', 'Ecuador': '🇪🇨',
  'Uruguay': '🇺🇾', 'Venezuela': '🇻🇪', 'Nigeria': '🇳🇬', 'Kenya': '🇰🇪',
  'Ghana': '🇬🇭', 'Egypt': '🇪🇬', 'Morocco': '🇲🇦', 'Serbia': '🇷🇸',
  'Bulgaria': '🇧🇬', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮',
  'Philippines': '🇵🇭', 'Vietnam': '🇻🇳', 'Cuba': '🇨🇺', 'Nicaragua': '🇳🇮',
};

export function getCountryFlag(countryName: string): string {
  if (!countryName) return '🍺';
  return COUNTRY_FLAGS[countryName] || '🍺';
}

export function formatCountryWithFlag(countryName: string): string {
  return `${getCountryFlag(countryName)} ${countryName}`;
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

const searchCache = new Map<string, { items: Brewery[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export async function searchBreweriesCached(
  query: string,
  perPage = 15
): Promise<Brewery[]> {
  const key = query.toLowerCase().trim();
  const cached = searchCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.items;
  }

  const items = await searchBreweriesByText(query, perPage);
  searchCache.set(key, { items, timestamp: Date.now() });

  // Prune old entries
  if (searchCache.size > 300) {
    const entries = Array.from(searchCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    for (const [k] of entries.slice(0, entries.length - 300)) {
      searchCache.delete(k);
    }
  }

  return items;
}