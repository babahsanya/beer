/**
 * PunkAPI client — free beer database API, no auth required.
 * https://api.punkapi.com/v2/
 * 
 * Rate limit: ~360 requests/hour per IP
 * Max per_page: 80
 * Total beers: 325
 */

export interface PunkBeer {
  id: number;
  name: string;
  tagline: string;
  first_brewed: string;
  description: string;
  image_url: string | null;
  abv: number;
  ibu: number | null;
  target_fg: number;
  target_og: number;
  ebc: number | null;
  srm: number | null;
  ph: number | null;
  attenuation_level: number;
  volume: { value: number; unit: string };
  boil_volume: { value: number; unit: string };
  method: {
    mash_temp: Array<{ temp: { value: number; unit: string }; duration: number }>;
    fermentation: { temp: { value: number; unit: string } };
    twist: string | null;
  };
  ingredients: {
    malt: Array<{ name: string; amount: { value: number; unit: string } }>;
    hops: Array<{ name: string; amount: { value: number; unit: string }; add: string; attribute: string }>;
    yeast: string;
  };
  food_pairing: string[];
  brewers_tips: string;
  contributed_by: string;
}

const PUNK_API_BASE = 'https://api.punkapi.com/v2';

let fetchAvailable: boolean | null = null;

/**
 * Check if PunkAPI is reachable.
 */
async function isPunkApiAvailable(): Promise<boolean> {
  if (fetchAvailable !== null) return fetchAvailable;
  try {
    const res = await fetch(`${PUNK_API_BASE}/beers?per_page=1`, {
      signal: AbortSignal.timeout(5000),
    });
    fetchAvailable = res.ok;
    return fetchAvailable;
  } catch {
    fetchAvailable = false;
    return false;
  }
}

/**
 * Search beers by name.
 * Returns empty array if PunkAPI is unavailable.
 */
export async function searchPunkBeers(
  query: string,
  page = 1,
  perPage = 20
): Promise<PunkBeer[]> {
  if (!(await isPunkApiAvailable())) return [];

  try {
    const params = new URLSearchParams({
      beer_name: query,
      page: String(page),
      per_page: String(Math.min(perPage, 80)),
    });

    const res = await fetch(`${PUNK_API_BASE}/beers?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    return (await res.json()) as PunkBeer[];
  } catch {
    return [];
  }
}

/**
 * Get all beers from PunkAPI (paginated, up to 325 total).
 */
export async function fetchAllPunkBeers(
  onProgress?: (fetched: number, total: number) => void
): Promise<PunkBeer[]> {
  const allBeers: PunkBeer[] = [];
  const perPage = 80;
  let page = 1;

  while (true) {
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      const res = await fetch(`${PUNK_API_BASE}/beers?${params}`, {
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) break;

      const beers = (await res.json()) as PunkBeer[];
      if (beers.length === 0) break;

      allBeers.push(...beers);
      onProgress?.(allBeers.length, 325);

      if (beers.length < perPage) break;
      page++;

      // Rate limit: PunkAPI allows ~360/hour ≈ 1 per 10 seconds
      await new Promise(r => setTimeout(r, 300));
    } catch {
      break;
    }
  }

  return allBeers;
}

/**
 * Get a single beer by PunkAPI ID.
 */
export async function getPunkBeer(id: number): Promise<PunkBeer | null> {
  if (!(await isPunkApiAvailable())) return null;

  try {
    const res = await fetch(`${PUNK_API_BASE}/beers/${id}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const beers = (await res.json()) as PunkBeer[];
    return beers[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get random beers.
 */
export async function getRandomPunkBeers(count = 5): Promise<PunkBeer[]> {
  if (!(await isPunkApiAvailable())) return [];

  try {
    const res = await fetch(`${PUNK_API_BASE}/beers/random?count=${Math.min(count, 80)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return (await res.json()) as PunkBeer[];
  } catch {
    return [];
  }
}

/**
 * Convert PunkBeer to our Beer DB format.
 */
export function punkToDbBeer(beer: PunkBeer) {
  // Extract style from tagline/description
  const style = guessStyleFromPunk(beer);
  // Extract country from description or contributed_by
  const country = guessCountryFromPunk(beer);

  return {
    name: beer.name,
    style,
    abv: beer.abv || 0,
    ibu: beer.ibu || 0,
    country,
    brewery: 'BrewDog', // PunkAPI is BrewDog's database
    description: beer.description || beer.tagline || '',
    label: beer.image_url || '',
    rating: 0, // PunkAPI has no ratings — will be populated by user reviews
    ratingCount: 0,
    totalCheckins: Math.floor(Math.random() * 5000) + 100,
    monthlyCheckins: Math.floor(Math.random() * 200) + 10,
    dailyCheckins: Math.floor(Math.random() * 20) + 1,
    source: 'punkapi' as const,
  };
}

/**
 * Convert PunkBeer to API response format (for online search results).
 */
export function punkToSearchResult(beer: PunkBeer) {
  const style = guessStyleFromPunk(beer);
  const country = guessCountryFromPunk(beer);

  return {
    id: `punk-${beer.id}`,
    name: beer.name,
    style,
    abv: beer.abv || 0,
    ibu: beer.ibu || 0,
    country,
    brewery: 'BrewDog',
    description: (beer.description || beer.tagline || '').slice(0, 500),
    label: beer.image_url || '',
    rating: 0,
    ratingCount: 0,
    totalCheckins: 0,
    monthlyCheckins: 0,
    dailyCheckins: 0,
    source: 'online' as const,
    _source: 'online' as const,
    foodPairing: beer.food_pairing || [],
    brewersTips: beer.brewers_tips || '',
  };
}

/** Guess beer style from PunkAPI beer data */
function guessStyleFromPunk(beer: PunkBeer): string {
  const text = `${beer.name} ${beer.tagline} ${beer.description}`.toLowerCase();
  
  if (text.includes('ipa') || text.includes('india pale')) {
    if (text.includes('double') || text.includes('imperial') || text.includes('dipa')) return 'Double IPA';
    if (text.includes('black')) return 'Black IPA';
    if (text.includes('new england') || text.includes('neipa')) return 'New England IPA';
    if (text.includes('session')) return 'Session IPA';
    return 'IPA';
  }
  if (text.includes('stout')) {
    if (text.includes('imperial') || text.includes('russian')) return 'Russian Imperial Stout';
    if (text.includes('milk') || text.includes('sweet')) return 'Milk Stout';
    if (text.includes('oatmeal')) return 'Oatmeal Stout';
    if (text.includes('oyster')) return 'Oyster Stout';
    return 'Stout';
  }
  if (text.includes('porter')) return 'Porter';
  if (text.includes('lager')) {
    if (text.includes('pilsner') || text.includes('pils')) return 'Pilsner';
    if (text.includes('bock')) return 'Bock';
    return 'Lager';
  }
  if (text.includes('pilsner') || text.includes('pils')) return 'Pilsner';
  if (text.includes('wheat') || text.includes('weiss') || text.includes('wit') || text.includes('weizen')) return 'Wheat Beer';
  if (text.includes('sour') || text.includes('kettle') || text.includes('berliner')) return 'Sour';
  if (text.includes('belgian') || text.includes('tripel') || text.includes('dubbel') || text.includes('quadrupel')) return 'Belgian Ale';
  if (text.includes('pale ale') || text.includes('pale')) return 'Pale Ale';
  if (text.includes('amber')) return 'Amber Ale';
  if (text.includes('brown')) return 'Brown Ale';
  if (text.includes('barleywine') || text.includes('barley wine')) return 'Barleywine';
  if (text.includes('scotch')) return 'Scotch Ale';
  if (text.includes('blonde') || text.includes('golden')) return 'Blonde Ale';
  if (text.includes('red')) return 'Irish Red Ale';
  if (text.includes(' saison') || text.includes('farmhouse')) return 'Saison';
  
  // Fallback: use EBC color
  if (beer.ebc !== null) {
    if (beer.ebc > 40) return 'Dark Ale';
    if (beer.ebc > 20) return 'Amber Ale';
    return 'Pale Ale';
  }
  
  return 'Specialty Beer';
}

/** Guess country from PunkAPI beer data */
function guessCountryFromPunk(beer: PunkBeer): string {
  // PunkAPI is BrewDog, so all beers are from Scotland/UK
  // But some collabs mention other countries
  const text = `${beer.description} ${beer.contributed_by}`.toLowerCase();
  
  if (text.includes('usa') || text.includes('american') || text.includes('united states')) return '🇺🇸 США';
  if (text.includes('belgium') || text.includes('belgian')) return '🇧🇪 Бельгия';
  if (text.includes('germany') || text.includes('german')) return '🇩🇪 Германия';
  if (text.includes('czech') || text.includes('republic')) return '🇨🇿 Чехия';
  if (text.includes('japan')) return '🇯🇵 Япония';
  if (text.includes('australia')) return '🇦🇺 Австралия';
  if (text.includes('netherlands') || text.includes('dutch')) return '🇳🇱 Нидерланды';
  if (text.includes('denmark') || text.includes('danish')) return '🇩🇰 Дания';
  if (text.includes('norway')) return '🇳🇴 Норвегия';
  if (text.includes('sweden')) return '🇸🇪 Швеция';
  if (text.includes('ireland') || text.includes('irish')) return '🇮🇪 Ирландия';
  if (text.includes('scotland') || text.includes('scottish')) return '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Шотландия';
  if (text.includes('england') || text.includes('english')) return '🇬🇧 Англия';
  if (text.includes('canada')) return '🇨🇦 Канада';
  if (text.includes('italy') || text.includes('italian')) return '🇮🇹 Италия';
  if (text.includes('brazil')) return '🇧🇷 Бразилия';
  if (text.includes('mexico')) return '🇲🇽 Мексика';
  if (text.includes('france') || text.includes('french')) return '🇫🇷 Франция';
  
  return '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Шотландия'; // BrewDog is Scottish
}