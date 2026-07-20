import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { readLimiter, writeLimiter, getClientIp } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from "@/lib/api";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "только что";
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

/**
 * GET /api/history — the 10 most recent search queries for the user.
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

    const history = await db.searchHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const formatted = history.map((entry) => ({
      id: entry.id,
      query: entry.query,
      resultCount: entry.resultCount,
      createdAt: entry.createdAt.toISOString(),
      timeAgo: formatTimeAgo(entry.createdAt),
    }));

    return apiSuccess({ history: formatted });
  } catch (error) {
    logger.error("History error", { error: String(error) });
    return apiInternalError("Ошибка при загрузке истории");
  }
}

/**
 * DELETE /api/history — clear all of the user's search history.
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

    const result = await db.searchHistory.deleteMany({
      where: { userId: user.id },
    });

    return apiSuccess({ deleted: result.count });
  } catch (error) {
    logger.error("History clear error", { error: String(error) });
    return apiInternalError("Ошибка при очистке истории");
  }
}
