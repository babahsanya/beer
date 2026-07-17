import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const totalBeers = await db.beer.count();
    const skip = Math.floor(Math.random() * totalBeers);

    const beer = await db.beer.findFirst({
      skip,
      include: {
        _count: {
          select: { reviews: true },
        },
      },
    });

    if (!beer) {
      return NextResponse.json({ error: 'No beers found' }, { status: 404 });
    }

    return NextResponse.json({
      ...beer,
      reviewCount: beer._count.reviews,
    });
  } catch (error) {
    console.error('Random beer API error:', error);
    return NextResponse.json({ error: 'Failed to fetch random beer' }, { status: 500 });
  }
}