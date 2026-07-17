import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_ACHIEVEMENTS = [
  { key: "first_search", title: "Первый поиск", description: "Выполните первый поиск", icon: "🔍", target: 1 },
  { key: "beer_explorer", title: "Исследователь", description: "Просмотрите 10 разных сортов", icon: "🌍", target: 10 },
  { key: "style_taster", title: "Дегустатор", description: "Попробуйте пиво 5 разных стилей", icon: "🍺", target: 5 },
  { key: "favorite_collector", title: "Коллекционер", description: "Добавьте 5 пив в избранное", icon: "❤️", target: 5 },
  { key: "quiz_master", title: "Знаток", description: "Наберите 8/10 в квизе", icon: "🧠", target: 1 },
  { key: "night_owl", title: "Ночная сова", description: "Используйте приложение после 23:00", icon: "🦉", target: 1 },
  { key: "beer_guru", title: "Пивной гуру", description: "Просмотрите все 35 сортов пива", icon: "🏆", target: 35 },
  { key: "stout_lover", title: "Любитель стаутов", description: "Просмотрите 3 стаута", icon: "🖤", target: 3 },
];

async function syncProgress(key: string, progress: number) {
  const achievement = await db.userAchievement.findUnique({ where: { key } });
  if (!achievement) return;

  const shouldUnlock =
    progress >= achievement.target && !achievement.unlockedAt;

  await db.userAchievement.update({
    where: { key },
    data: {
      progress,
      ...(shouldUnlock ? { unlockedAt: new Date() } : {}),
    },
  });
}

export async function GET() {
  try {
    // Ensure achievements are seeded
    const count = await db.userAchievement.count();
    if (count === 0) {
      for (const a of DEFAULT_ACHIEVEMENTS) {
        await db.userAchievement.create({ data: a });
      }
    }

    // --- first_search: count of SearchHistory ---
    const searchCount = await db.searchHistory.count();
    await syncProgress("first_search", searchCount);

    // --- beer_explorer + beer_guru: distinct beerId count in ViewHistory ---
    const allViews = await db.viewHistory.findMany({
      select: { beerId: true },
    });
    const distinctBeersViewed = new Set(allViews.map((v) => v.beerId)).size;
    await syncProgress("beer_explorer", distinctBeersViewed);
    await syncProgress("beer_guru", distinctBeersViewed);

    // --- style_taster: distinct styles viewed ---
    const beerIds = [...new Set(allViews.map((v) => v.beerId))];
    const beers = beerIds.length > 0
      ? await db.beer.findMany({
          where: { id: { in: beerIds } },
          select: { style: true },
        })
      : [];
    const distinctStyles = new Set(beers.map((b) => b.style)).size;
    await syncProgress("style_taster", distinctStyles);

    // --- stout_lover: views of stouts ---
    const stoutCount = beers.filter((b) =>
      b.style.toLowerCase().includes("stout")
    ).length;
    await syncProgress("stout_lover", stoutCount);

    // --- favorite_collector: count of favorites ---
    const favoriteCount = await db.favorite.count();
    await syncProgress("favorite_collector", favoriteCount);

    // --- night_owl: check if current hour >= 23 ---
    const currentHour = new Date().getHours();
    if (currentHour >= 23) {
      const owl = await db.userAchievement.findUnique({
        where: { key: "night_owl" },
      });
      if (owl && !owl.unlockedAt) {
        await db.userAchievement.update({
          where: { key: "night_owl" },
          data: { progress: 1, unlockedAt: new Date() },
        });
      }
    }

    // Return all achievements after sync
    const achievements = await db.userAchievement.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error("Error syncing achievements:", error);
    return NextResponse.json(
      { error: "Ошибка синхронизации достижений" },
      { status: 500 }
    );
  }
}