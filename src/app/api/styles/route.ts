import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const beers = await db.beer.findMany({
      select: {
        style: true,
        rating: true,
        name: true,
        id: true,
      },
    });

    const styleMap = new Map<string, { count: number; totalRating: number; exampleBeer: string; exampleBeerId: string }>();

    for (const beer of beers) {
      const existing = styleMap.get(beer.style);
      if (existing) {
        existing.count += 1;
        existing.totalRating += beer.rating;
      } else {
        styleMap.set(beer.style, {
          count: 1,
          totalRating: beer.rating,
          exampleBeer: beer.name,
          exampleBeerId: beer.id,
        });
      }
    }

    const styles = Array.from(styleMap.entries())
      .map(([style, data]) => ({
        style,
        count: data.count,
        avgRating: Math.round((data.totalRating / data.count) * 100) / 100,
        exampleBeer: data.exampleBeer,
        exampleBeerId: data.exampleBeerId,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(styles);
  } catch (error) {
    console.error('Styles API error:', error);
    return NextResponse.json({ error: 'Failed to fetch styles' }, { status: 500 });
  }
}