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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify beer exists
    const beer = await db.beer.findUnique({ where: { id } });
    if (!beer) {
      return NextResponse.json(
        { error: 'Пиво не найдено' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { author, rating, comment } = body;

    // Validate author
    if (!author || typeof author !== 'string' || author.trim().length < 2) {
      return NextResponse.json(
        { error: 'Имя автора обязательно (минимум 2 символа)' },
        { status: 400 }
      );
    }

    // Validate rating
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 0.5 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Оценка должна быть от 0.5 до 5' },
        { status: 400 }
      );
    }

    // Validate comment length
    if (comment && typeof comment === 'string' && comment.length > 500) {
      return NextResponse.json(
        { error: 'Комментарий не должен превышать 500 символов' },
        { status: 400 }
      );
    }

    // Create review
    const review = await db.review.create({
      data: {
        beerId: id,
        author: author.trim(),
        rating: ratingNum,
        comment: (comment || '').trim(),
      },
    });

    // Recalculate beer rating
    const allReviews = await db.review.findMany({
      where: { beerId: id },
      select: { rating: true },
    });

    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await db.beer.update({
      where: { id },
      data: {
        rating: Math.round(avgRating * 100) / 100,
        ratingCount: allReviews.length,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Create review error:', error);
    return NextResponse.json(
      { error: 'Ошибка при создании отзыва' },
      { status: 500 }
    );
  }
}