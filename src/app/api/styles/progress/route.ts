import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    // Get all beers with their style, name, rating, id
    const beers = await db.beer.findMany({
      select: {
        id: true,
        name: true,
        style: true,
        rating: true,
      },
    });

    // Get all viewed beer IDs
    const viewHistory = await db.viewHistory.findMany({
      select: {
        beerId: true,
      },
    });

    const viewedBeerIds = new Set(viewHistory.map((v) => v.beerId));

    // Group beers by style
    const styleMap = new Map<
      string,
      {
        beers: { id: string; name: string; rating: number }[];
      }
    >();

    for (const beer of beers) {
      const existing = styleMap.get(beer.style);
      if (existing) {
        existing.beers.push({ id: beer.id, name: beer.name, rating: beer.rating });
      } else {
        styleMap.set(beer.style, {
          beers: [{ id: beer.id, name: beer.name, rating: beer.rating }],
        });
      }
    }

    // Build progress data for each style
    const styles = Array.from(styleMap.entries())
      .map(([name, data]) => {
        const viewedBeers = data.beers.filter((b) => viewedBeerIds.has(b.id));
        const discovered = viewedBeers.length > 0;

        // Find top-rated viewed beer in this style
        const topRated = viewedBeers.length > 0
          ? viewedBeers.reduce((best, b) => (b.rating > best.rating ? b : best), viewedBeers[0])
          : null;

        return {
          name,
          totalBeers: data.beers.length,
          viewedBeers: viewedBeers.length,
          discovered,
          topRatedBeerName: topRated?.name ?? null,
          topRatedBeerRating: topRated?.rating ?? null,
        };
      })
      .sort((a, b) => {
        // Discovered first, then by viewed count desc
        if (a.discovered !== b.discovered) return a.discovered ? -1 : 1;
        return b.viewedBeers - a.viewedBeers;
      });

    const totalStyles = styles.length;
    const discoveredStyles = styles.filter((s) => s.discovered).length;
    const percentage = totalStyles > 0 ? Math.round((discoveredStyles / totalStyles) * 100) : 0;

    return NextResponse.json({
      styles,
      totalStyles,
      discoveredStyles,
      percentage,
    });
  } catch (error) {
    console.error('Style progress API error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки прогресса' }, { status: 500 });
  }
}