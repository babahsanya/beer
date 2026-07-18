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

    const beers = await db.beer.findMany({
      orderBy: { rating: 'desc' },
      take: 5,
      include: {
        _count: {
          select: { reviews: true },
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
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}