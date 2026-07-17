import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [totalBeers, totalReviews, totalFavorites, topRated, mostCheckedIn, avgResult] =
      await Promise.all([
        db.beer.count(),
        db.review.count(),
        db.favorite.count(),
        db.beer.findFirst({
          orderBy: { rating: 'desc' },
          select: { name: true },
        }),
        db.beer.findFirst({
          orderBy: { totalCheckins: 'desc' },
          select: { name: true },
        }),
        db.beer.aggregate({
          _avg: { rating: true },
        }),
      ]);

    // Count distinct styles and countries
    const [stylesResult, countriesResult] = await Promise.all([
      db.beer.findMany({
        select: { style: true },
        distinct: ['style'],
      }),
      db.beer.findMany({
        select: { country: true },
        distinct: ['country'],
      }),
    ]);

    return NextResponse.json({
      totalBeers,
      totalReviews,
      totalFavorites,
      totalStyles: stylesResult.length,
      totalCountries: countriesResult.length,
      topRatedBeer: topRated?.name ?? '',
      mostCheckedIn: mostCheckedIn?.name ?? '',
      avgRating: avgResult._avg.rating ? Math.round(avgResult._avg.rating * 10) / 10 : 0,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}