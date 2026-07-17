import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

const BREWERY_COORDS: Record<string, { lat: number; lng: number }> = {
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
  "To Øl": { lat: 55.67, lng: 12.56 },
  "Lervig": { lat: 58.97, lng: 5.73 },
  "Garage Project": { lat: -41.29, lng: 174.78 },
  "Epic Brewing Company": { lat: -36.85, lng: 174.76 },
  "Coopers Brewery": { lat: -34.93, lng: 138.60 },
  "Weihenstephaner": { lat: 48.82, lng: 11.73 },
  "Paulaner": { lat: 48.14, lng: 11.58 },
  "Ayinger": { lat: 48.02, lng: 11.35 },
  "Schneider Weisse": { lat: 48.12, lng: 11.84 },
  "Rochefort": { lat: 50.19, lng: 5.23 },
  "Westmalle": { lat: 51.29, lng: 4.73 },
  "Orval": { lat: 49.63, lng: 5.85 },
  "Duvel Moortgat": { lat: 51.01, lng: 4.25 },
  "Brasserie Dupont": { lat: 50.53, lng: 3.90 },
  "Unibroue": { lat: 45.32, lng: 73.56 },
  "Brouwerij Bosteels": { lat: 50.87, lng: 3.96 },
  "Guinness": { lat: 53.34, lng: -6.29 },
  "Samuel Smith Old Brewery": { lat: 53.84, lng: -1.71 },
  "Pilsner Urquell": { lat: 49.73, lng: 13.59 },
  "Kozel": { lat: 49.39, lng: 13.89 },
  "Stella Artois": { lat: 50.63, lng: 5.48 },
  "Hoegaarden": { lat: 50.77, lng: 4.88 },
};

// Aliases for breweries in seed data that don't exactly match the lookup keys
const BREWERY_ALIASES: Record<string, string> = {
  "Guinness & Co.": "Guinness",
  "Bayerische Staatsbrauerei Weihenstephan": "Weihenstephaner",
  "Plzeňský Prazdroj": "Pilsner Urquell",
  "Brouwerij Westmalle": "Westmalle",
  "Abbaye de Chimay": "Rochefort",
  "Brasserie de Rochefort": "Rochefort",
  "Brouwerij Hoegaarden": "Hoegaarden",
  "Abbaye Notre-Dame d'Orval": "Orval",
  "Ayinger Privatbrauerei": "Ayinger",
  "Brasserie Duyck": "Duvel Moortgat",
};

export async function GET() {
  try {
    // Get all beers with brewery info
    const beers = await db.beer.findMany({
      select: {
        id: true,
        name: true,
        brewery: true,
        country: true,
        rating: true,
      },
    });

    // Group by brewery
    const breweryMap = new Map<string, {
      beers: { id: string; name: string; rating: number }[];
      country: string;
    }>();

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

    const result: Array<{
      id: string;
      name: string;
      country: string;
      lat: number;
      lng: number;
      beerCount: number;
      topBeer: string;
      topBeerId: string;
      avgRating: number;
    }> = [];

    for (const [breweryName, data] of breweryMap) {
      // Try direct lookup, then alias
      const coords = BREWERY_COORDS[breweryName] ?? BREWERY_COORDS[BREWERY_ALIASES[breweryName] ?? ''];
      if (!coords) continue;

      // Top beer by rating
      const sortedBeers = [...data.beers].sort((a, b) => b.rating - a.rating);
      const topBeer = sortedBeers[0];

      // Average rating
      const avgRating = data.beers.reduce((sum, b) => sum + b.rating, 0) / data.beers.length;

      result.push({
        id: breweryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: breweryName,
        country: data.country,
        lat: coords.lat,
        lng: coords.lng,
        beerCount: data.beers.length,
        topBeer: topBeer.name,
        topBeerId: topBeer.id,
        avgRating: Math.round(avgRating * 100) / 100,
      });
    }

    // Sort by beer count descending
    result.sort((a, b) => b.beerCount - a.beerCount);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Map API error:', error);
    return NextResponse.json({ error: 'Failed to fetch map data' }, { status: 500 });
  }
}