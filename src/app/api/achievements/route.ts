import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { readLimiter, writeLimiter, getClientIp } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiBadRequest,
  apiNotFound,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from "@/lib/api";
import { formatZodErrors } from "@/lib/validation";
// Stage 5: import shared DEFAULT_ACHIEVEMENTS (was duplicated inline here
// and in achievements/check/route.ts — Stage 5 extracted to lib/achievements.ts)
import { DEFAULT_ACHIEVEMENTS } from "@/lib/achievements";

/**
 * GET /api/achievements — list the user's achievements.
 * On the first request for a user (no rows yet), seed all DEFAULT_ACHIEVEMENTS
 * with the user's id, then return the freshly-seeded list.
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

    const existing = await db.userAchievement.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    if (existing.length === 0) {
      await db.userAchievement.createMany({
        data: DEFAULT_ACHIEVEMENTS.map((a) => ({
          userId: user.id,
          key: a.key,
          title: a.title,
          description: a.description,
          icon: a.icon,
          target: a.target,
        })),
        skipDuplicates: true,
      });
    }

    const achievements = await db.userAchievement.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    return apiSuccess({ achievements });
  } catch (error) {
    logger.error("Error fetching achievements", { error: String(error) });
    return apiInternalError("Ошибка загрузки достижений");
  }
}

/**
 * POST /api/achievements — increment an achievement's progress.
 * Body: { key: string, increment?: number }
 * Uses upsert on the @@unique([userId, key]) compound key with
 * `update: { progress: { increment: n } }`. If the row doesn't exist and the
 * key is part of DEFAULT_ACHIEVEMENTS, it is created on the fly; otherwise a
 * 404 is returned. When progress crosses the target, unlockedAt is set.
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
      return apiBadRequest("Укажите корректный key достижения");
    }

    const bodySchema = z
      .object({
        key: z.string().max(50),
        increment: z.number().int().min(0).max(100).default(1),
      })
      .strict();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest(
        "Укажите корректный key достижения",
        formatZodErrors(parsed.error),
      );
    }
    const { key, increment: safeIncrement } = parsed.data;

    // If the row already exists and is already unlocked, this is a no-op.
    const current = await db.userAchievement.findUnique({
      where: { userId_key: { userId: user.id, key } },
    });

    if (current?.unlockedAt) {
      return apiSuccess({ achievement: current });
    }

    // For the create branch we need default metadata; reject if unknown key
    // and the row does not already exist.
    const def = DEFAULT_ACHIEVEMENTS.find((a) => a.key === key);
    if (!def && !current) {
      return apiNotFound("Достижение не найдено");
    }

    const achievement = await db.userAchievement.upsert({
      where: { userId_key: { userId: user.id, key } },
      update: { progress: { increment: safeIncrement } },
      create: {
        userId: user.id,
        key,
        title: def?.title ?? key,
        description: def?.description ?? "",
        icon: def?.icon ?? "🍺",
        target: def?.target ?? 1,
        progress: safeIncrement,
      },
    });

    // Cap progress at the target and unlock if we just crossed the threshold.
    if (!achievement.unlockedAt && achievement.progress >= achievement.target) {
      const unlocked = await db.userAchievement.update({
        where: { userId_key: { userId: user.id, key } },
        data: {
          progress: Math.min(achievement.progress, achievement.target),
          unlockedAt: new Date(),
        },
      });
      return apiSuccess({ achievement: unlocked });
    }

    return apiSuccess({ achievement });
  } catch (error) {
    logger.error("Error updating achievement", { error: String(error) });
    return apiInternalError("Ошибка обновления достижения");
  }
}
