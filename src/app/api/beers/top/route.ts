import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const beers = await db.beer.findMany({
      orderBy: {
        rating: 'desc',
      },
      take: 5,
      include: {
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    const formatted = beers.map((beer) => ({
      id: beer.id,
      name: beer.name,
      style: beer.style,
      abv: beer.abv,
      ibu: beer.ibu,
      country: beer.country,
      brewery: beer.brewery,
      description: beer.description,
      label: beer.label,
      rating: beer.rating,
      ratingCount: beer.ratingCount,
      totalCheckins: beer.totalCheckins,
      monthlyCheckins: beer.monthlyCheckins,
      dailyCheckins: beer.dailyCheckins,
      source: beer.source,
      reviewCount: beer._count.reviews,
    }));

    return NextResponse.json({ beers: formatted });
  } catch (error) {
    console.error('Top beers API error:', error);
    return NextResponse.json({ error: 'Failed to fetch top beers' }, { status: 500 });
  }
}