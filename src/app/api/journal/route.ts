import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { readLimiter, writeLimiter, getClientIp } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiBadRequest,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from "@/lib/api";
import {
  paginationSchema,
  dateRangeSchema,
  tastingEntryCreateSchema,
  formatZodErrors,
} from "@/lib/validation";

const journalQuerySchema = paginationSchema
  .extend({
    style: z.string().max(100).optional(),
    minRating: z.coerce.number().int().min(0).max(5).optional(),
    withNotes: z
      .string()
      .optional()
      .transform((v) => v === "true"),
    page: z.coerce.number().int().min(1).optional(),
  })
  .and(dateRangeSchema);

/**
 * GET /api/journal — paginated tasting entries for the authenticated user.
 * Query params:
 *   limit, offset     — pagination (limit clamped to 1..100)
 *   page              — 1-based page (alternative to offset)
 *   style             — filter by beerStyle
 *   minRating         — filter by personalRating >= (0..5)
 *   withNotes=true    — only entries with a non-empty comment
 *   dateFrom, dateTo  — filter by createdAt range (ISO datetime strings)
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests(
        "Слишком много запросов",
        Math.ceil((rl.resetAt - Date.now()) / 1000),
      );
    }

    const userOrError = await requireUser();
    if (userOrError instanceof NextResponse) return userOrError;
    const user = userOrError;

    const searchParams = request.nextUrl.searchParams;
    const rawQuery = Object.fromEntries(searchParams.entries());
    const parsed = journalQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return apiBadRequest("Некорректные параметры", formatZodErrors(parsed.error));
    }
    const { limit, offset, page, style, minRating, withNotes, dateFrom, dateTo } =
      parsed.data;

    const skip = page ? (page - 1) * limit : offset;

    const where: {
      userId: string;
      beerStyle?: string;
      personalRating?: { gte: number };
      comment?: { not: string };
      createdAt?: { gte?: Date; lte?: Date };
    } = { userId: user.id };

    if (style) {
      where.beerStyle = style;
    }
    if (minRating !== undefined && minRating > 0) {
      where.personalRating = { gte: minRating };
    }
    if (withNotes) {
      where.comment = { not: "" };
    }
    if (dateFrom || dateTo) {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) createdAt.lte = new Date(dateTo);
      where.createdAt = createdAt;
    }

    const [entries, total] = await Promise.all([
      db.tastingEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.tastingEntry.count({ where }),
    ]);

    const currentPage = page ?? Math.floor(skip / limit) + 1;
    return apiSuccess({
      entries,
      pagination: {
        page: currentPage,
        limit,
        offset: skip,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + entries.length < total,
      },
    });
  } catch (error) {
    logger.error("Get journal error", { error: String(error) });
    return apiInternalError("Ошибка при загрузке журнала");
  }
}

/**
 * POST /api/journal — create a tasting entry for the authenticated user.
 * Body validated via tastingEntryCreateSchema (strict — rejects unknown keys).
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests(
        "Слишком много запросов",
        Math.ceil((rl.resetAt - Date.now()) / 1000),
      );
    }

    const userOrError = await requireUser();
    if (userOrError instanceof NextResponse) return userOrError;
    const user = userOrError;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest("Укажите название пива");
    }

    const parsed = tastingEntryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest("Некорректные данные", formatZodErrors(parsed.error));
    }

    const entry = await db.tastingEntry.create({
      data: {
        userId: user.id,
        ...parsed.data,
      },
    });

    return apiSuccess({ entry }, { status: 201 });
  } catch (error) {
    logger.error("Create journal entry error", { error: String(error) });
    return apiInternalError("Ошибка при создании записи");
  }
}
