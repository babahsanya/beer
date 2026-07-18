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
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}