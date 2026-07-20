import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, writeLimiter, getClientIp } from '@/lib/rate-limit';
import {
  apiSuccess,
  apiBadRequest,
  apiNotFound,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests();
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    if (typeof id !== 'string' || id.length > 100 || id.includes('/')) {
      return apiBadRequest('Некорректный ID');
    }

    const beer = await db.beer.findUnique({ where: { id }, select: { id: true } });
    if (!beer) {
      return apiNotFound('Пиво не найдено');
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

    return apiSuccess({
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
    return apiInternalError('Ошибка при загрузке отзывов');
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
      return apiTooManyRequests();
    }

    const userOrRes = await requireUser();
    if (userOrRes instanceof NextResponse) return userOrRes;
    const user = userOrRes;

    const { id } = await params;

    if (typeof id !== 'string' || id.length > 100 || id.includes('/')) {
      return apiBadRequest('Некорректный ID');
    }

    const beer = await db.beer.findUnique({ where: { id }, select: { id: true } });
    if (!beer) {
      return apiNotFound('Пиво не найдено');
    }

    const body = await request.json();
    const { rating, comment } = body as Record<string, unknown>;

    // Author from session — never trust client for identity.
    const safeAuthor = (user.name || user.email).slice(0, 50);

    const ratingNum = Number(rating);
    if (
      isNaN(ratingNum) ||
      ratingNum < 0.5 ||
      ratingNum > 5 ||
      ratingNum % 0.5 !== 0
    ) {
      return apiBadRequest('Оценка должна быть от 0.5 до 5 с шагом 0.5');
    }

    const rawComment = typeof comment === 'string' ? comment : '';
    if (rawComment.length > 500) {
      return apiBadRequest('Комментарий не должен превышать 500 символов');
    }
    const safeComment = rawComment.trim().replace(/[<>"'&]/g, '');

    // Cap total reviews per beer to keep the page snappy.
    const existingReviewCount = await db.review.count({ where: { beerId: id } });
    if (existingReviewCount >= 100) {
      return apiTooManyRequests('Максимум отзывов для этого пива достигнут');
    }

    // Upsert by [beerId, userId] — one review per user per beer.
    const review = await db.review.upsert({
      where: { beerId_userId: { beerId: id, userId: user.id } },
      create: {
        beerId: id,
        userId: user.id,
        author: safeAuthor,
        rating: ratingNum,
        comment: safeComment,
      },
      update: {
        author: safeAuthor,
        rating: ratingNum,
        comment: safeComment,
      },
    });

    // Recalculate beer rating via aggregate (no N+1, no full table scan).
    const agg = await db.review.aggregate({
      where: { beerId: id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const avgRating = agg._avg.rating ?? 0;
    const ratingCount = agg._count.rating ?? 0;

    await db.beer.update({
      where: { id },
      data: {
        rating: Math.round(avgRating * 100) / 100,
        ratingCount,
      },
    });

    return apiSuccess(review);
  } catch (error) {
    console.error('Create review error:', error);
    return apiInternalError('Ошибка при создании отзыва');
  }
}
