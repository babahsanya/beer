import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readLimiter, writeLimiter, getClientIp } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiBadRequest,
  apiNotFound,
  apiForbidden,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from "@/lib/api";

/**
 * GET /api/journal/[id] — fetch one tasting entry (must be the owner).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const entry = await db.tastingEntry.findUnique({ where: { id } });

    if (!entry) {
      return apiNotFound("Запись не найдена");
    }

    if (entry.userId !== user.id) {
      return apiForbidden();
    }

    return apiSuccess(entry);
  } catch (error) {
    console.error("Get journal entry error:", error);
    return apiInternalError("Ошибка при загрузке записи");
  }
}

/**
 * PUT /api/journal/[id] — update one tasting entry.
 * Verifies ownership (entry.userId === user.id) before updating; returns
 * apiForbidden() otherwise.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const existing = await db.tastingEntry.findUnique({ where: { id } });

    if (!existing) {
      return apiNotFound("Запись не найдена");
    }

    if (existing.userId !== user.id) {
      return apiForbidden();
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest("Некорректный JSON");
    }

    const {
      beerName,
      beerStyle,
      brewery,
      abv,
      country,
      personalRating,
      aroma,
      taste,
      appearance,
      mouthfeel,
      comment,
      location,
      glassType,
      wouldBuyAgain,
    } = body;

    const entry = await db.tastingEntry.update({
      where: { id },
      data: {
        ...(beerName !== undefined && { beerName: String(beerName).trim() }),
        ...(beerStyle !== undefined && {
          beerStyle: String(beerStyle).trim(),
        }),
        ...(brewery !== undefined && { brewery: String(brewery).trim() }),
        ...(abv !== undefined && { abv: Number(abv) || 0 }),
        ...(country !== undefined && { country: String(country).trim() }),
        ...(personalRating !== undefined && {
          personalRating: Math.min(
            5,
            Math.max(0, parseInt(String(personalRating), 10) || 0),
          ),
        }),
        ...(aroma !== undefined && {
          aroma: Math.min(5, Math.max(0, parseInt(String(aroma), 10) || 0)),
        }),
        ...(taste !== undefined && {
          taste: Math.min(5, Math.max(0, parseInt(String(taste), 10) || 0)),
        }),
        ...(appearance !== undefined && {
          appearance: Math.min(
            5,
            Math.max(0, parseInt(String(appearance), 10) || 0),
          ),
        }),
        ...(mouthfeel !== undefined && {
          mouthfeel: Math.min(
            5,
            Math.max(0, parseInt(String(mouthfeel), 10) || 0),
          ),
        }),
        ...(comment !== undefined && { comment: String(comment).trim() }),
        ...(location !== undefined && { location: String(location).trim() }),
        ...(glassType !== undefined && {
          glassType: String(glassType).trim(),
        }),
        ...(wouldBuyAgain !== undefined && {
          wouldBuyAgain: Boolean(wouldBuyAgain),
        }),
      },
    });

    return apiSuccess({ entry });
  } catch (error) {
    console.error("Update journal entry error:", error);
    return apiInternalError("Ошибка при обновлении записи");
  }
}

/**
 * DELETE /api/journal/[id] — delete one tasting entry.
 * Verifies ownership (entry.userId === user.id) before deleting; returns
 * apiForbidden() otherwise.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const existing = await db.tastingEntry.findUnique({ where: { id } });

    if (!existing) {
      return apiNotFound("Запись не найдена");
    }

    if (existing.userId !== user.id) {
      return apiForbidden();
    }

    await db.tastingEntry.delete({ where: { id } });

    return apiSuccess({ deleted: id });
  } catch (error) {
    console.error("Delete journal entry error:", error);
    return apiInternalError("Ошибка при удалении записи");
  }
}
