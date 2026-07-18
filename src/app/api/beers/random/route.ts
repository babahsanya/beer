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
      return NextResponse.json({ error: 'Пиво не найдено' }, { status: 404 });
    }

    return NextResponse.json({
      ...beer,
      reviewCount: beer._count.reviews,
    });
  } catch (error) {
    console.error('Random beer API error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}