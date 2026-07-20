import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeLimiter, getClientIp } from '@/lib/rate-limit';
import {
  apiSuccess,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from '@/lib/api';

const DEFAULT_ACHIEVEMENTS = [
  { key: 'first_search', title: 'Первый поиск', description: 'Выполните первый поиск', icon: '🔍', target: 1 },
  { key: 'beer_explorer', title: 'Исследователь', description: 'Просмотрите 10 разных сортов', icon: '🌍', target: 10 },
  { key: 'style_taster', title: 'Дегустатор', description: 'Попробуйте пиво 5 разных стилей', icon: '🍺', target: 5 },
  { key: 'favorite_collector', title: 'Коллекционер', description: 'Добавьте 5 пив в избранное', icon: '❤️', target: 5 },
  { key: 'quiz_master', title: 'Знаток', description: 'Наберите 8/10 в квизе', icon: '🧠', target: 1 },
  { key: 'night_owl', title: 'Ночная сова', description: 'Используйте приложение после 23:00', icon: '🦉', target: 1 },
  { key: 'beer_guru', title: 'Пивной гуру', description: 'Просмотрите все 35 сортов пива', icon: '🏆', target: 35 },
  { key: 'stout_lover', title: 'Любитель стаутов', description: 'Просмотрите 3 стаута', icon: '🖤', target: 3 },
] as const;

/**
 * Sync progress for a single achievement. Only moves the needle forward
 * (or unlocks if threshold hit). Idempotent — safe to call repeatedly.
 */
async function syncProgress(userId: string, key: string, progress: number) {
  const achievement = await db.userAchievement.findUnique({
    where: { userId_key: { userId, key } },
  });
  if (!achievement) return;

  // Only update if progress increased (or new unlock).
  if (progress <= achievement.progress && achievement.unlockedAt) return;

  const shouldUnlock = progress >= achievement.target && !achievement.unlockedAt;

  await db.userAchievement.update({
    where: { userId_key: { userId, key } },
    data: {
      progress: Math.max(achievement.progress, Math.min(progress, achievement.target)),
      ...(shouldUnlock ? { unlockedAt: new Date() } : {}),
    },
  });
}

/**
 * POST /api/achievements/check
 *
 * Syncs the calling user's achievement progress with their actual activity
 * (searches, views, favorites) and returns the updated achievement list.
 *
 * This was previously a GET — mutating on GET is a CORS/preflight footgun
 * and lets browsers accidentally trigger writes via pre-fetch.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests();
    }

    const userOrRes = await requireUser();
    if (userOrRes instanceof NextResponse) return userOrRes;
    const user = userOrRes;

    // Ensure default achievement rows exist for this user.
    await Promise.all(
      DEFAULT_ACHIEVEMENTS.map((a) =>
        db.userAchievement.upsert({
          where: { userId_key: { userId: user.id, key: a.key } },
          create: {
            userId: user.id,
            key: a.key,
            title: a.title,
            description: a.description,
            icon: a.icon,
            target: a.target,
          },
          update: {},
        })
      )
    );

    // Sync progress from actual data, scoped to this user.
    const searchCount = await db.searchHistory.count({ where: { userId: user.id } });
    await syncProgress(user.id, 'first_search', searchCount);

    const allViews = await db.viewHistory.findMany({
      where: { userId: user.id },
      select: { beerId: true },
    });
    const distinctBeersViewed = new Set(allViews.map((v) => v.beerId)).size;
    await syncProgress(user.id, 'beer_explorer', distinctBeersViewed);
    await syncProgress(user.id, 'beer_guru', distinctBeersViewed);

    const beerIds = [...new Set(allViews.map((v) => v.beerId))];
    const beers = beerIds.length > 0
      ? await db.beer.findMany({
          where: { id: { in: beerIds } },
          select: { style: true },
        })
      : [];
    const distinctStyles = new Set(beers.map((b) => b.style)).size;
    await syncProgress(user.id, 'style_taster', distinctStyles);

    const stoutCount = beers.filter((b) =>
      b.style.toLowerCase().includes('stout')
    ).length;
    await syncProgress(user.id, 'stout_lover', stoutCount);

    const favoriteCount = await db.favorite.count({ where: { userId: user.id } });
    await syncProgress(user.id, 'favorite_collector', favoriteCount);

    // night_owl: based on server-side UTC hour. We use getUTCHours() so the
    // threshold is consistent regardless of which timezone the server runs in
    // (23:00–04:00 UTC counts as "night"). This is server-side by design —
    // the client's local clock would be user-spoofable.
    const currentHour = new Date().getUTCHours();
    if (currentHour >= 23 || currentHour < 4) {
      await syncProgress(user.id, 'night_owl', 1);
    }

    const achievements = await db.userAchievement.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    return apiSuccess({ achievements });
  } catch (error) {
    console.error('Error syncing achievements:', error);
    return apiInternalError('Ошибка синхронизации достижений');
  }
}
