import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, writeLimiter, getClientIp } from '@/lib/rate-limit';

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
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Validate id format to prevent injection
    if (typeof id !== 'string' || id.length > 100 || id.includes('/')) {
      return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
    }

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
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const { id } = await params;

    // Validate id format
    if (typeof id !== 'string' || id.length > 100 || id.includes('/')) {
      return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
    }

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

    // Validate author: string, min 2 chars, max 50 chars, no HTML
    if (!author || typeof author !== 'string' || author.trim().length < 2 || author.trim().length > 50) {
      return NextResponse.json(
        { error: 'Имя автора обязательно (2-50 символов)' },
        { status: 400 }
      );
    }

    // SECURITY: Strip HTML/script tags from author
    const safeAuthor = author.trim().replace(/[<>"'&]/g, '');

    // Validate rating
    const ratingNum = Number(rating);
    if (isNaN(ratingNum) || ratingNum < 0.5 || ratingNum > 5) {
      return NextResponse.json(
        { error: 'Оценка должна быть от 0.5 до 5' },
        { status: 400 }
      );
    }

    // Validate comment: optional, max 500 chars, strip HTML
    const rawComment = typeof comment === 'string' ? comment : '';
    if (rawComment.length > 500) {
      return NextResponse.json(
        { error: 'Комментарий не должен превышать 500 символов' },
        { status: 400 }
      );
    }
    const safeComment = rawComment.trim().replace(/[<>"'&]/g, '');

    // SECURITY: Rate limit reviews per beer (max 5 reviews per beer per IP stored check)
    const existingReviewCount = await db.review.count({ where: { beerId: id } });
    if (existingReviewCount >= 100) {
      return NextResponse.json(
        { error: 'Максимум отзывов для этого пива достигнут' },
        { status: 429 }
      );
    }

    // Create review
    const review = await db.review.create({
      data: {
        beerId: id,
        author: safeAuthor,
        rating: ratingNum,
        comment: safeComment,
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