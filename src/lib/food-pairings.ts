export interface FoodPairingItem {
  emoji: string;
  name: string;
}

export const foodPairingsMap: Record<string, FoodPairingItem[]> = {
  "ipa": [
    { emoji: "🧀", name: "Острые сыры" },
    { emoji: "🌶️", name: "Острая еда" },
    { emoji: "🍜", name: "Тайская кухня" },
    { emoji: "🥩", name: "Жареное мясо" },
  ],
  "stout": [
    { emoji: "🍫", name: "Шоколадные десерты" },
    { emoji: "🦪", name: "Устрицы" },
    { emoji: "🍖", name: "Барбекю рёбрышки" },
    { emoji: "🧀", name: "Голубой сыр" },
  ],
  "lager": [
    { emoji: "🦐", name: "Морепродукты" },
    { emoji: "🥗", name: "Салаты" },
    { emoji: "🍝", name: "Лёгкая паста" },
    { emoji: "🍗", name: "Курица" },
  ],
  "wheat beer": [
    { emoji: "🦐", name: "Морепродукты" },
    { emoji: "🥗", name: "Салаты" },
    { emoji: "🍓", name: "Фруктовые десерты" },
    { emoji: "🧀", name: "Мягкие сыры" },
  ],
  "porter": [
    { emoji: "🥩", name: "Жареное мясо" },
    { emoji: "🍲", name: "Тушёные блюда" },
    { emoji: "🍫", name: "Шоколад" },
    { emoji: "🧀", name: "Копчёный сыр" },
  ],
  "sour": [
    { emoji: "🧀", name: "Сырные тарелки" },
    { emoji: "🥗", name: "Фруктовые салаты" },
    { emoji: "🐟", name: "Жареная рыба" },
    { emoji: "🥓", name: "Мясная нарезка" },
  ],
  "pilsner": [
    { emoji: "🍕", name: "Пицца" },
    { emoji: "🥨", name: "Прецели" },
    { emoji: "🐟", name: "Жареная рыба" },
    { emoji: "🥩", name: "Свинина" },
  ],
  "belgian": [
    { emoji: "🦪", name: "Мидии" },
    { emoji: "🥩", name: "Стейк с фри" },
    { emoji: "🧀", name: "Выдержанные сыры" },
    { emoji: "🥧", name: "Фруктовые тарты" },
  ],
  "pale ale": [
    { emoji: "🍔", name: "Бургеры" },
    { emoji: "🐟", name: "Рыба с картофелем" },
    { emoji: "🍗", name: "Куриные крылышки" },
    { emoji: "🧀", name: "Чеддер" },
  ],
  "amber ale": [
    { emoji: "🍗", name: "Жареная курица" },
    { emoji: "🥩", name: "Свиные отбивные" },
    { emoji: "🧅", name: "Карамелизированный лук" },
    { emoji: "🍚", name: "Ризотто" },
  ],
  "brown ale": [
    { emoji: "🍗", name: "Жареная птица" },
    { emoji: "🥕", name: "Корнеплоды" },
    { emoji: "🧊", name: "Ореховые сыры" },
    { emoji: "🍲", name: "Тушёные блюда" },
  ],
  "barleywine": [
    { emoji: "🧀", name: "Голубой сыр" },
    { emoji: "🫕", name: "Фуа-гра" },
    { emoji: "🍫", name: "Тёмный шоколад" },
    { emoji: "🥜", name: "Орехи" },
  ],
};

/**
 * Get food pairing suggestions for a beer style.
 * Matches using case-insensitive includes.
 */
export function getFoodPairings(style: string): FoodPairingItem[] {
  const lower = style.toLowerCase();
  for (const [key, pairings] of Object.entries(foodPairingsMap)) {
    if (lower.includes(key)) {
      return pairings;
    }
  }
  // Fallback for wheat/weiss/wit styles
  if (lower.includes("wheat") || lower.includes("weiss") || lower.includes("wit")) {
    return foodPairingsMap["wheat beer"];
  }
  // Generic fallback
  return [
    { emoji: "🧀", name: "Сырная тарелка" },
    { emoji: "🥩", name: "Мясные закуски" },
    { emoji: "🥨", name: "Прецели" },
    { emoji: "🍟", name: "Картофель фри" },
  ];
}