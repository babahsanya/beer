import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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