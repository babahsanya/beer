import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeLimiter, readLimiter, getClientIp } from '@/lib/rate-limit';

const DEFAULT_ACHIEVEMENTS = [
  {
    key: 'first_search',
    title: 'Первый поиск',
    description: 'Выполните первый поиск',
    icon: '🔍',
    target: 1,
  },
  {
    key: 'beer_explorer',
    title: 'Исследователь',
    description: 'Просмотрите 10 разных сортов',
    icon: '🌍',
    target: 10,
  },
  {
    key: 'style_taster',
    title: 'Дегустатор',
    description: 'Попробуйте пиво 5 разных стилей',
    icon: '🍺',
    target: 5,
  },
  {
    key: 'favorite_collector',
    title: 'Коллекционер',
    description: 'Добавьте 5 пив в избранное',
    icon: '❤️',
    target: 5,
  },
  {
    key: 'quiz_master',
    title: 'Знаток',
    description: 'Наберите 8/10 в квизе',
    icon: '🧠',
    target: 1,
  },
  {
    key: 'night_owl',
    title: 'Ночная сова',
    description: 'Используйте приложение после 23:00',
    icon: '🦉',
    target: 1,
  },
  {
    key: 'beer_guru',
    title: 'Пивной гуру',
    description: 'Просмотрите все 35 сортов пива',
    icon: '🏆',
    target: 35,
  },
  {
    key: 'stout_lover',
    title: 'Любитель стаутов',
    description: 'Просмотрите 3 стаута',
    icon: '🖤',
    target: 3,
  },
];

async function seedAchievements() {
  const count = await db.userAchievement.count();
  if (count === 0) {
    for (const a of DEFAULT_ACHIEVEMENTS) {
      await db.userAchievement.create({ data: a });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit read
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    await seedAchievements();

    const achievements = await db.userAchievement.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки достижений' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit write
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await request.json();
    const { key, increment = 1 } = body;

    // Validate key: must be a non-empty string matching known pattern
    if (!key || typeof key !== 'string' || !/^[a-z_]{1,50}$/.test(key)) {
      return NextResponse.json(
        { error: 'Укажите корректный key достижения' },
        { status: 400 }
      );
    }

    // SECURITY: Cap increment to prevent manipulation
    // Normal usage: 1-5 per action. Maximum allowed: 10.
    const safeIncrement = typeof increment === 'number'
      ? Math.min(Math.max(Math.round(increment), 1), 10)
      : 1;

    const achievement = await db.userAchievement.findUnique({
      where: { key },
    });

    if (!achievement) {
      return NextResponse.json(
        { error: 'Достижение не найдено' },
        { status: 404 }
      );
    }

    // SECURITY: Don't allow incrementing already-unlocked achievements
    if (achievement.unlockedAt) {
      return NextResponse.json({ achievement });
    }

    const newProgress = achievement.progress + safeIncrement;
    const shouldUnlock = newProgress >= achievement.target;

    const updated = await db.userAchievement.update({
      where: { key },
      data: {
        progress: Math.min(newProgress, achievement.target),
        ...(shouldUnlock ? { unlockedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ achievement: updated });
  } catch (error) {
    console.error('Error updating achievement:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления достижения' },
      { status: 500 }
    );
  }
}