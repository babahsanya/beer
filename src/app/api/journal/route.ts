import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readLimiter, writeLimiter, getClientIp } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiBadRequest,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from "@/lib/api";

/**
 * GET /api/journal — paginated tasting entries for the authenticated user.
 * Query params:
 *   page, limit      — pagination (limit clamped to 1..50)
 *   style            — filter by beerStyle
 *   minRating        — filter by personalRating >=
 *   withNotes=true   — only entries with a non-empty comment
 *   dateFrom, dateTo — filter by createdAt range (ISO date strings)
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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const style = searchParams.get("style") || "";
    const minRating = parseInt(searchParams.get("minRating") || "0", 10);
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const withNotes = searchParams.get("withNotes") === "true";

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
    if (minRating > 0) {
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.tastingEntry.count({ where }),
    ]);

    return apiSuccess({
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get journal error:", error);
    return apiInternalError("Ошибка при загрузке журнала");
  }
}

/**
 * POST /api/journal — create a tasting entry for the authenticated user.
 * Body fields are validated and clamped to sane ranges before insert.
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest("Укажите название пива");
    }

    const {
      beerId = "",
      beerName = "",
      beerStyle = "",
      brewery = "",
      abv = 0,
      country = "",
      personalRating = 0,
      aroma = 0,
      taste = 0,
      appearance = 0,
      mouthfeel = 0,
      comment = "",
      location = "",
      glassType = "",
      wouldBuyAgain = false,
    } = body;

    if (typeof beerName !== "string" || beerName.trim().length === 0) {
      return apiBadRequest("Укажите название пива");
    }

    if (Number(personalRating) < 0 || Number(personalRating) > 5) {
      return apiBadRequest("Оценка должна быть от 0 до 5");
    }

    const entry = await db.tastingEntry.create({
      data: {
        userId: user.id,
        beerId: String(beerId || ""),
        beerName: String(beerName).trim(),
        beerStyle: String(beerStyle).trim(),
        brewery: String(brewery).trim(),
        abv: Number(abv) || 0,
        country: String(country).trim(),
        personalRating: Math.min(
          5,
          Math.max(0, parseInt(String(personalRating), 10) || 0),
        ),
        aroma: Math.min(5, Math.max(0, parseInt(String(aroma), 10) || 0)),
        taste: Math.min(5, Math.max(0, parseInt(String(taste), 10) || 0)),
        appearance: Math.min(
          5,
          Math.max(0, parseInt(String(appearance), 10) || 0),
        ),
        mouthfeel: Math.min(
          5,
          Math.max(0, parseInt(String(mouthfeel), 10) || 0),
        ),
        comment: String(comment).trim(),
        location: String(location).trim(),
        glassType: String(glassType).trim(),
        wouldBuyAgain: Boolean(wouldBuyAgain),
      },
    });

    return apiSuccess({ entry }, { status: 201 });
  } catch (error) {
    console.error("Create journal entry error:", error);
    return apiInternalError("Ошибка при создании записи");
  }
}
