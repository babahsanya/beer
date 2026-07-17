import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Verify beer exists
    const beer = await db.beer.findUnique({ where: { id } });
    if (!beer) {
      return NextResponse.json(
        { error: 'Пиво не найдено' },
        { status: 404 }
      );
    }

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where: { beerId: id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.review.count({ where: { beerId: id } }),
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + reviews.length < total,
      },
    });
  } catch (error) {
    console.error('Reviews error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке отзывов' },
      { status: 500 }
    );
  }
}