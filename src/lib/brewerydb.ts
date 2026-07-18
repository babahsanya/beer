/**
 * Open Brewery DB client — free brewery API, no auth required.
 * https://api.openbrewerydb.org/v1/
 * Used for real brewery locations on the map.
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

/**
 * Search breweries by country or city.
 */
export async function searchBreweries(options: {
  country?: string;
  city?: string;
  name?: string;
  perPage?: number;
  page?: number;
}): Promise<Brewery[]> {
  const params = new URLSearchParams();
  if (options.country) params.set('by_country', options.country);
  if (options.city) params.set('by_city', options.city);
  if (options.name) params.set('by_name', options.name);
  params.set('per_page', String(options.perPage || 20));
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

/**
 * Get breweries with coordinates for map display.
 * Fetches a diverse set from different countries.
 */
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
  // Fetch from key beer-producing countries
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

/**
 * Country flag emojis for display.
 */
const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸',
  'Belgium': '🇧🇪',
  'Germany': '🇩🇪',
  'United Kingdom': '🇬🇧',
  'Czech Republic': '🇨🇿',
  'Netherlands': '🇳🇱',
  'Ireland': '🇮🇪',
  'Denmark': '🇩🇰',
  'Japan': '🇯🇵',
  'Australia': '🇦🇺',
  'Norway': '🇳🇴',
  'Sweden': '🇸🇪',
  'Canada': '🇨🇦',
  'Italy': '🇮🇹',
  'France': '🇫🇷',
  'Poland': '🇵🇱',
  'Brazil': '🇧🇷',
  'Mexico': '🇲🇽',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'South Korea': '🇰🇷',
  'New Zealand': '🇳🇿',
  'Argentina': '🇦🇷',
  'Thailand': '🇹🇭',
};

export function getCountryFlag(countryName: string): string {
  return COUNTRY_FLAGS[countryName] || '🍺';
}