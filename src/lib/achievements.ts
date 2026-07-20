/**
 * Shared default achievement catalogue.
 *
 * Used by:
 *   - src/app/api/achievements/route.ts (seeding + lookup)
 *   - src/app/api/achievements/check/route.ts (syncProgress defaults)
 *
 * Extracted in Stage 5 of the audit recovery — the two routes had
 * identical copies of the array.
 */

export interface DefaultAchievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  target: number;
}

export const DEFAULT_ACHIEVEMENTS: readonly DefaultAchievement[] = [
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

/** Find a default achievement definition by its key. */
export function findDefaultAchievement(
  key: string,
): DefaultAchievement | undefined {
  return DEFAULT_ACHIEVEMENTS.find((a) => a.key === key);
}
