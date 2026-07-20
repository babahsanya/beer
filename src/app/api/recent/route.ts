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

const MAX_HISTORY = 20;

/**
 * GET /api/recent — list the 20 most recent beers viewed by the user.
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

    const history = await db.viewHistory.findMany({
      where: { userId: user.id },
      include: { beer: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return apiSuccess(
      history.map((h) => ({
        id: h.id,
        beerId: h.beerId,
        beerName: h.beerName,
        createdAt: h.createdAt.toISOString(),
        beer: h.beer
          ? {
              id: h.beer.id,
              name: h.beer.name,
              style: h.beer.style,
              abv: h.beer.abv,
              ibu: h.beer.ibu,
              country: h.beer.country,
              brewery: h.beer.brewery,
              description: h.beer.description,
              label: h.beer.label,
              rating: h.beer.rating,
              ratingCount: h.beer.ratingCount,
            }
          : null,
      })),
    );
  } catch (error) {
    logger.error("Recent view error", { error: String(error) });
    return apiInternalError("Ошибка");
  }
}

/**
 * POST /api/recent — record a beer view for the authenticated user.
 * Body: { beerId: string, beerName?: string }
 * Idempotent upsert by @@unique([userId, beerId]) — replaces the previous
 * delete+create sequence that was racy under concurrent requests.
 * Caps the user's history at MAX_HISTORY (20) newest entries.
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
      return apiBadRequest("Укажите корректный beerId");
    }

    const bodySchema = z
      .object({
        beerId: beerIdSchema,
        beerName: z.string().max(200).optional(),
      })
      .strict();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest("Укажите корректный beerId", formatZodErrors(parsed.error));
    }
    const { beerId, beerName } = parsed.data;

    const safeBeerName = beerName
      ? beerName.replace(/[<>"'&]/g, "").slice(0, 200)
      : "";

    const now = new Date();
    const record = await db.viewHistory.upsert({
      where: { userId_beerId: { userId: user.id, beerId } },
      create: {
        userId: user.id,
        beerId,
        beerName: safeBeerName,
        createdAt: now,
      },
      update: {
        beerName: safeBeerName,
        createdAt: now,
      },
    });

    // Cap the user's history to the newest MAX_HISTORY entries.
    const count = await db.viewHistory.count({ where: { userId: user.id } });
    if (count > MAX_HISTORY) {
      const toDelete = await db.viewHistory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        take: count - MAX_HISTORY,
        select: { id: true },
      });
      if (toDelete.length > 0) {
        await db.viewHistory.deleteMany({
          where: { id: { in: toDelete.map((d) => d.id) } },
        });
      }
    }

    return apiSuccess({ id: record.id });
  } catch (error) {
    logger.error("Recent view create error", { error: String(error) });
    return apiInternalError("Ошибка");
  }
}

/**
 * DELETE /api/recent?all=true         — clear all of the user's recent views
 * DELETE /api/recent?beerId=<id>      — remove one view by beerId
 */
export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const beerIdRaw = searchParams.get("beerId");
    const deleteAll = searchParams.get("all") === "true";

    if (deleteAll) {
      const result = await db.viewHistory.deleteMany({
        where: { userId: user.id },
      });
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

    const deleted = await db.viewHistory.deleteMany({
      where: { userId: user.id, beerId },
    });

    if (deleted.count === 0) {
      return apiNotFound("Запись не найдена");
    }

    return apiSuccess({ deleted: deleted.count });
  } catch (error) {
    logger.error("Recent clear error", { error: String(error) });
    return apiInternalError("Ошибка при очистке");
  }
}
