import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { readLimiter, writeLimiter, getClientIp } from "@/lib/rate-limit";
import { beerIdSchema, formatZodErrors } from "@/lib/validation";
import {
  apiSuccess,
  apiBadRequest,
  apiNotFound,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from "@/lib/api";

/**
 * GET /api/favorites
 * GET /api/favorites?beerId=<id> — boolean check
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests("Слишком много запросов", Math.ceil((rl.resetAt - Date.now()) / 1000));
    }

    const userOrError = await requireUser();
    if (userOrError instanceof NextResponse) return userOrError;
    const user = userOrError;

    const beerIdRaw = request.nextUrl.searchParams.get("beerId");

    if (beerIdRaw) {
      const beerIdResult = beerIdSchema.safeParse(beerIdRaw);
      if (!beerIdResult.success) {
        return apiBadRequest("Невалидный beerId");
      }
      const beerId = beerIdResult.data;
      const favorite = await db.favorite.findUnique({
        where: { userId_beerId: { userId: user.id, beerId } },
        include: { beer: true },
      });
      return apiSuccess({ isFavorite: !!favorite, favorite });
    }

    const favorites = await db.favorite.findMany({
      where: { userId: user.id },
      include: { beer: true },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(favorites);
  } catch (error) {
    logger.error("Get favorites error", { error: String(error) });
    return apiInternalError("Ошибка при загрузке избранного");
  }
}

/**
 * POST /api/favorites
 * Body: { beerId: string }
 * Idempotent upsert by @@unique([userId, beerId]).
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests("Слишком много запросов", Math.ceil((rl.resetAt - Date.now()) / 1000));
    }

    const userOrError = await requireUser();
    if (userOrError instanceof NextResponse) return userOrError;
    const user = userOrError;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest("Укажите корректный beerId");
    }

    const bodySchema = z.object({ beerId: beerIdSchema }).strict();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest("Укажите корректный beerId", formatZodErrors(parsed.error));
    }
    const { beerId } = parsed.data;

    const beer = await db.beer.findUnique({ where: { id: beerId } });
    if (!beer) {
      return apiNotFound("Пиво не найдено");
    }

    const favorite = await db.favorite.upsert({
      where: { userId_beerId: { userId: user.id, beerId } },
      update: {},
      create: { userId: user.id, beerId },
      include: { beer: true },
    });

    return apiSuccess({ id: favorite.id, favorite });
  } catch (error) {
    logger.error("Add favorite error", { error: String(error) });
    return apiInternalError("Ошибка при добавлении в избранное");
  }
}

/**
 * DELETE /api/favorites?beerId=<id>   — delete one
 * DELETE /api/favorites?all=true       — delete all user's favorites
 */
export async function DELETE(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests("Слишком много запросов", Math.ceil((rl.resetAt - Date.now()) / 1000));
    }

    const userOrError = await requireUser();
    if (userOrError instanceof NextResponse) return userOrError;
    const user = userOrError;

    const searchParams = request.nextUrl.searchParams;
    const beerIdRaw = searchParams.get("beerId");
    const deleteAll = searchParams.get("all") === "true";

    if (deleteAll) {
      const result = await db.favorite.deleteMany({ where: { userId: user.id } });
      return apiSuccess({ deleted: result.count });
    }

    if (!beerIdRaw) {
      return apiBadRequest("Укажите beerId или all=true");
    }

    const beerIdResult = beerIdSchema.safeParse(beerIdRaw);
    if (!beerIdResult.success) {
      return apiBadRequest("Укажите beerId или all=true");
    }
    const beerId = beerIdResult.data;

    const deleted = await db.favorite.deleteMany({
      where: { userId: user.id, beerId },
    });

    if (deleted.count === 0) {
      return apiNotFound("Пиво не найдено в избранном");
    }

    return apiSuccess({ deleted: deleted.count });
  } catch (error) {
    logger.error("Remove favorite error", { error: String(error) });
    return apiInternalError("Ошибка при удалении из избранного");
  }
}
