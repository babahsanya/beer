import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { readLimiter, getClientIp } from '@/lib/rate-limit';

const topQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'all']).default('week'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = topQuerySchema.safeParse({
      period: searchParams.get('period') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректные параметры' },
        { status: 400 },
      );
    }
    const { period, limit } = parsed.data;

    // Sort by the activity metric that matches the requested period:
    //   day   → beers with the most checkins today (dailyCheckins)
    //   week  → beers with the most checkins this month (best weekly proxy)
    //   month → same as week (monthlyCheckins)
    //   all   → all-time highest rated
    const orderBy =
      period === 'day'
        ? { dailyCheckins: 'desc' as const }
        : period === 'week' || period === 'month'
          ? { monthlyCheckins: 'desc' as const }
          : { rating: 'desc' as const };

    const beers = await db.beer.findMany({
      orderBy,
      take: limit,
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
    logger.error('Top beers API error', { error: String(error) });
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}
