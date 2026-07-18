import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';

const VALID_CATEGORIES = ['craft', 'macro', 'global', 'weekly'] as const;

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = (searchParams.get('category') || 'global') as string;

    if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      return NextResponse.json(
        { error: 'Недопустимая категория' },
        { status: 400 }
      );
    }

    const trending = await db.trendingBeer.findMany({
      where: { category },
      include: {
        beer: true,
      },
      orderBy: { rank: 'asc' },
    });

    const result = trending.map((entry) => ({
      ...entry.beer,
      checkinDelta: entry.checkinDelta,
      rank: entry.rank,
    }));

    return NextResponse.json({ trending: result, category });
  } catch (error) {
    console.error('Trending error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке трендов' },
      { status: 500 }
    );
  }
}