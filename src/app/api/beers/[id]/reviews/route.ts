import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { readLimiter, writeLimiter, getClientIp } from '@/lib/rate-limit';
import {
  apiSuccess,
  apiBadRequest,
  apiNotFound,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from '@/lib/api';
import {
  cuidSchema,
  ratingSchema,
  commentSchema,
  smallLimitSchema,
  formatZodErrors,
} from '@/lib/validation';

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

    const { id: rawId } = await params;
    const idResult = cuidSchema.safeParse(rawId);
    if (!idResult.success) {
      return apiBadRequest('Некорректный ID');
    }
    const id = idResult.data;

    const searchParams = request.nextUrl.searchParams;
    const queryParsed = smallLimitSchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });
    if (!queryParsed.success) {
      return apiBadRequest('Некорректные параметры', formatZodErrors(queryParsed.error));
    }
    const { limit, offset } = queryParsed.data;

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
    logger.error('Reviews error', { error: String(error) });
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

    const { id: rawId } = await params;
    const idResult = cuidSchema.safeParse(rawId);
    if (!idResult.success) {
      return apiBadRequest('Некорректный ID');
    }
    const id = idResult.data;

    const beer = await db.beer.findUnique({ where: { id }, select: { id: true } });
    if (!beer) {
      return apiNotFound('Пиво не найдено');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest('Некорректный JSON');
    }

    const bodySchema = z.object({
      rating: ratingSchema,
      comment: commentSchema.optional(),
    });
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest(
        'Оценка должна быть от 0.5 до 5 с шагом 0.5',
        formatZodErrors(parsed.error),
      );
    }
    const { rating } = parsed.data;

    // Author from session — never trust client for identity.
    const safeAuthor = (user.name || user.email).slice(0, 50);

    // commentSchema already trims; we additionally strip HTML special chars
    // for defense in depth (the value is rendered on the beer detail page).
    const safeComment = (parsed.data.comment ?? '').replace(/[<>"'&]/g, '');

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
        rating,
        comment: safeComment,
      },
      update: {
        author: safeAuthor,
        rating,
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
    logger.error('Create review error', { error: String(error) });
    return apiInternalError('Ошибка при создании отзыва');
  }
}
