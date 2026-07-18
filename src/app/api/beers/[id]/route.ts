import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const { id } = await params;

    // For online beers (id starts with "online-"), return stored data from search
    // These beers don't exist in the DB, so return a mock detail from what we have
    if (id.startsWith('online-')) {
      return NextResponse.json(
        { error: 'Онлайн-результат — подробности недоступны' },
        { status: 404 }
      );
    }

    const beer = await db.beer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { reviews: true, favorites: true },
        },
      },
    });

    if (!beer) {
      return NextResponse.json(
        { error: 'Пиво не найдено' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...beer,
      reviewCount: beer._count.reviews,
      isFavorited: beer._count.favorites > 0,
    });
  } catch (error) {
    console.error('Beer detail error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке пива' },
      { status: 500 }
    );
  }
}