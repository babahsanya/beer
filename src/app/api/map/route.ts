import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';
import {
  searchBreweries as searchOpenBreweries,
} from '@/lib/brewerydb';
import {
  searchBreweriesCached,
  isUntappdAvailable,
  localizeCountry,
} from '@/lib/untappd';

// Cache brewery map data (refreshed every 30 minutes)
let cachedMapData: Array<Record<string, unknown>> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000;

interface BreweryMapPoint {
  id: string;
  name: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  beerCount: number;
  topBeer: string;
  topBeerId: string;
  avgRating: number;
  source: 'local' | 'api' | 'untappd';
  breweryType?: string;
  website?: string | null;
  breweryLabel?: string;
  breweryUrl?: string;
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    // Return cached data if fresh
    if (cachedMapData && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json(cachedMapData);
    }

    // --- Source 1: Local DB breweries (grouped, with hardcoded coordinates) ---
    const beers = await db.beer.findMany({
      select: { id: true, name: true, brewery: true, country: true, rating: true },
    });

    const breweryMap = new Map<string, { beers: { id: string; name: string; rating: number }[]; country: string }>();
    for (const beer of beers) {
      const existing = breweryMap.get(beer.brewery);
      if (existing) {
        existing.beers.push({ id: beer.id, name: beer.name, rating: beer.rating });
      } else {
        breweryMap.set(beer.brewery, {
          beers: [{ id: beer.id, name: beer.name, rating: beer.rating }],
          country: beer.country,
        });
      }
    }

    // Known brewery coordinates (for local DB data)
    const KNOWN_COORDS: Record<string, { lat: number; lng: number }> = {
      "Russian River Brewing": { lat: 38.44, lng: -122.71 },
      "The Alchemist": { lat: 44.26, lng: -72.57 },
      "Three Floyds Brewing": { lat: 41.61, lng: -87.42 },
      "Tree House Brewery": { lat: 42.59, lng: -72.24 },
      "Hill Farmstead Brewery": { lat: 44.77, lng: -72.54 },
      "Goose Island Beer Co.": { lat: 41.88, lng: -87.64 },
      "Founders Brewing Co.": { lat: 42.96, lng: -85.66 },
      "Bell's Brewery": { lat: 42.30, lng: -85.51 },
      "Sierra Nevada Brewing Co.": { lat: 39.73, lng: -121.82 },
      "Dogfish Head": { lat: 38.65, lng: -75.56 },
      "Ballast Point": { lat: 32.72, lng: -117.17 },
      "Firestone Walker": { lat: 35.35, lng: -120.47 },
      "Cigar City Brewing": { lat: 27.97, lng: -82.46 },
      "BrewDog": { lat: 57.15, lng: -2.10 },
      "Mikkeller": { lat: 55.67, lng: 12.56 },
      "Guinness": { lat: 53.34, lng: -6.29 },
      "Weihenstephaner": { lat: 48.82, lng: 11.73 },
      "Paulaner": { lat: 48.14, lng: 11.58 },
      "Rochefort": { lat: 50.19, lng: 5.23 },
      "Westmalle": { lat: 51.29, lng: 4.73 },
      "Orval": { lat: 49.63, lng: 5.85 },
      "Duvel Moortgat": { lat: 51.01, lng: 4.25 },
      "Pilsner Urquell": { lat: 49.73, lng: 13.59 },
      "Stella Artois": { lat: 50.63, lng: 5.48 },
      "Hoegaarden": { lat: 50.77, lng: 4.88 },
      "Kozel": { lat: 49.39, lng: 13.89 },
      "Unibroue": { lat: 45.32, lng: 73.56 },
      "Brasserie Dupont": { lat: 50.53, lng: 3.90 },
      "Samuel Smith Old Brewery": { lat: 53.84, lng: -1.71 },
      "Brouwerij Bosteels": { lat: 50.87, lng: 3.96 },
      "Ayinger": { lat: 48.02, lng: 11.35 },
      "Schneider Weisse": { lat: 48.12, lng: 11.84 },
      "To Øl": { lat: 55.67, lng: 12.56 },
      "Lervig": { lat: 58.97, lng: 5.73 },
      "Garage Project": { lat: -41.29, lng: 174.78 },
      "Epic Brewing Company": { lat: -36.85, lng: 174.76 },
      "Coopers Brewery": { lat: -34.93, lng: 138.60 },
    };

    const ALIASES: Record<string, string> = {
      "Guinness & Co.": "Guinness",
      "Bayerische Staatsbrauerei Weihenstephan": "Weihenstephaner",
      "Plzeňský Prazdroj": "Pilsner Urquell",
      "Brouwerij Westmalle": "Westmalle",
      "Abbaye de Chimay": "Chimay",
      "Brasserie de Rochefort": "Rochefort",
      "Brouwerij Hoegaarden": "Hoegaarden",
      "Abbaye Notre-Dame d'Orval": "Orval",
      "Ayinger Privatbrauerei": "Ayinger",
    };

    const result: BreweryMapPoint[] = [];

    for (const [breweryName, data] of breweryMap) {
      const coords = KNOWN_COORDS[breweryName] ?? KNOWN_COORDS[ALIASES[breweryName] ?? ''];
      if (!coords) continue;

      const sortedBeers = [...data.beers].sort((a, b) => b.rating - a.rating);
      const topBeer = sortedBeers[0];
      const avgRating = data.beers.reduce((sum, b) => sum + b.rating, 0) / data.beers.length;

      result.push({
        id: breweryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: breweryName,
        country: data.country,
        city: '',
        lat: coords.lat,
        lng: coords.lng,
        beerCount: data.beers.length,
        topBeer: topBeer.name,
        topBeerId: topBeer.id,
        avgRating: Math.round(avgRating * 100) / 100,
        source: 'local',
      });
    }

    const existingNames = new Set(result.map(r => r.name.toLowerCase()));

    // --- Source 2: Untappd Brewery Search (real data with coordinates) ---
    if (await isUntappdAvailable()) {
      try {
        const popularBreweries = [
          'BrewDog', 'Guinness', 'Heineken', 'Sierra Nevada', 'Stone Brewing',
          'Bell\'s Brewery', 'Founders', 'Dogfish Head', 'Chimay', 'Rochefort',
          'Weihenstephan', 'Paulaner', 'Pilsner Urquell', 'Stella Artois',
          'Hoegaarden', 'Duvel', 'Westmalle', 'Orval', 'Mikkeller',
          'To Øl', 'Lervig', 'Garage Project', 'Coopers',
        ];

        const untappdBreweries = await Promise.allSettled(
          popularBreweries.map(name => searchBreweriesCached(name, 3))
        );

        for (const res of untappdBreweries) {
          if (res.status !== 'fulfilled') continue;
          for (const item of res.value) {
            const brewery = item.brewery;
            const loc = brewery.location;
            if (!loc?.lat || !loc?.lng) continue;
            if (loc.lat === 0 && loc.lng === 0) continue;

            const nameLower = brewery.brewery_name.toLowerCase();
            if (existingNames.has(nameLower)) continue;

            // Find local beer match
            let beerMatch = beers.find(beer => {
              const brewLower = beer.brewery.toLowerCase();
              return brewLower.includes(nameLower) || nameLower.includes(brewLower);
            });

            existingNames.add(nameLower);

            result.push({
              id: `untappd-${brewery.brewery_id}`,
              name: brewery.brewery_name,
              country: localizeCountry(brewery.country_name),
              city: loc.brewery_city || '',
              lat: loc.lat,
              lng: loc.lng,
              beerCount: beerMatch ? 1 : (item.brewery as Record<string, unknown>).total_count ? Number((item.brewery as Record<string, unknown>).total_count) || 0 : 0,
              topBeer: beerMatch?.name || '',
              topBeerId: beerMatch?.id || '',
              avgRating: beerMatch?.rating || (item.brewery as Record<string, unknown>).rating_score ? Number((item.brewery as Record<string, unknown>).rating_score) || 0 : 0,
              source: 'untappd',
              breweryType: (item.brewery as Record<string, unknown>).brewery_type as string | undefined,
              website: brewery.contact?.url || null,
              breweryLabel: brewery.brewery_label,
              breweryUrl: brewery.contact?.url,
            });
          }
        }
      } catch (error) {
        console.log('[Map] Untappd brewery search unavailable');
      }
    }

    // --- Source 3: Open Brewery DB (real brewery locations, no auth) ---
    try {
      const countries = ['United States', 'Belgium', 'Germany', 'United Kingdom', 'Czech Republic', 'Netherlands', 'Ireland', 'Denmark', 'Japan', 'Australia'];
      const apiBreweries = await Promise.allSettled(
        countries.map(c => searchOpenBreweries({ country: c, perPage: 8 }))
      );

      for (const res of apiBreweries) {
        if (res.status !== 'fulfilled') continue;
        for (const b of res.value) {
          if (!b.latitude || !b.longitude) continue;
          if (b.name.length < 3) continue;

          const key = b.name.toLowerCase();
          if (existingNames.has(key)) continue;
          existingNames.add(key);

          let beerMatch = beers.find(beer => {
            const brewLower = beer.brewery.toLowerCase();
            return brewLower.includes(key) || key.includes(brewLower);
          });

          result.push({
            id: b.id,
            name: b.name,
            country: b.country,
            city: b.city,
            lat: b.latitude,
            lng: b.longitude,
            beerCount: beerMatch ? 1 : 0,
            topBeer: beerMatch?.name || '',
            topBeerId: beerMatch?.id || '',
            avgRating: beerMatch?.rating || 0,
            source: 'api',
            breweryType: b.brewery_type,
            website: b.website_url,
          });
        }
      }
    } catch (error) {
      console.log('[Map] Open Brewery DB unavailable, using local data only');
    }

    result.sort((a, b) => b.beerCount - a.beerCount);

    cachedMapData = result as unknown as Array<Record<string, unknown>>;
    cacheTimestamp = Date.now();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Map API error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}