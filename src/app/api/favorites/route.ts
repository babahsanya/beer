import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readLimiter, writeLimiter, getClientIp } from "@/lib/rate-limit";
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

    const beerId = request.nextUrl.searchParams.get("beerId");

    if (beerId) {
      if (beerId.length > 100) {
        return apiBadRequest("Невалидный beerId");
      }
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
    console.error("Get favorites error:", error);
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest("Укажите корректный beerId");
    }
    const { beerId } = body;

    if (!beerId || typeof beerId !== "string" || beerId.length > 100) {
      return apiBadRequest("Укажите корректный beerId");
    }

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
    console.error("Add favorite error:", error);
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
    const beerId = searchParams.get("beerId");
    const deleteAll = searchParams.get("all") === "true";

    if (deleteAll) {
      const result = await db.favorite.deleteMany({ where: { userId: user.id } });
      return apiSuccess({ deleted: result.count });
    }

    if (!beerId || beerId.length > 100) {
      return apiBadRequest("Укажите beerId или all=true");
    }

    const deleted = await db.favorite.deleteMany({
      where: { userId: user.id, beerId },
    });

    if (deleted.count === 0) {
      return apiNotFound("Пиво не найдено в избранном");
    }

    return apiSuccess({ deleted: deleted.count });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return apiInternalError("Ошибка при удалении из избранного");
  }
}
