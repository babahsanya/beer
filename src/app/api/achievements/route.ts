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
 * Default achievement catalogue. Kept inline for now — Stage 5 will extract
 * this into a dedicated module.
 */
const DEFAULT_ACHIEVEMENTS = [
  {
    key: "first_search",
    title: "Первый поиск",
    description: "Выполните первый поиск",
    icon: "🔍",
    target: 1,
  },
  {
    key: "beer_explorer",
    title: "Исследователь",
    description: "Просмотрите 10 разных сортов",
    icon: "🌍",
    target: 10,
  },
  {
    key: "style_taster",
    title: "Дегустатор",
    description: "Попробуйте пиво 5 разных стилей",
    icon: "🍺",
    target: 5,
  },
  {
    key: "favorite_collector",
    title: "Коллекционер",
    description: "Добавьте 5 пив в избранное",
    icon: "❤️",
    target: 5,
  },
  {
    key: "quiz_master",
    title: "Знаток",
    description: "Наберите 8/10 в квизе",
    icon: "🧠",
    target: 1,
  },
  {
    key: "night_owl",
    title: "Ночная сова",
    description: "Используйте приложение после 23:00",
    icon: "🦉",
    target: 1,
  },
  {
    key: "beer_guru",
    title: "Пивной гуру",
    description: "Просмотрите все 35 сортов пива",
    icon: "🏆",
    target: 35,
  },
  {
    key: "stout_lover",
    title: "Любитель стаутов",
    description: "Просмотрите 3 стаута",
    icon: "🖤",
    target: 3,
  },
] as const;

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
    console.error("Error fetching achievements:", error);
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest("Укажите корректный key достижения");
    }

    const { key, increment = 1 } = body;

    if (typeof key !== "string" || !/^[a-z_]{1,50}$/.test(key)) {
      return apiBadRequest("Укажите корректный key достижения");
    }

    const safeIncrement =
      typeof increment === "number"
        ? Math.min(Math.max(Math.round(increment), 1), 10)
        : 1;

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
    console.error("Error updating achievement:", error);
    return apiInternalError("Ошибка обновления достижения");
  }
}
