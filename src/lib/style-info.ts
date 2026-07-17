export interface StyleInfoData {
  name: string;
  emoji: string;
  description: string;
  abvRange: string;
  ibuRange: string;
}

export const beerStyles: Record<string, StyleInfoData> = {
  "ipa": {
    name: "IPA",
    emoji: "🤙",
    description: "India Pale Ale — яркий хмелевой сорт с нотами цитрусовых, тропических фруктов и сосны. Высокая горечь и аромат.",
    abvRange: "5-7.5%",
    ibuRange: "40-70",
  },
  "stout": {
    name: "Stout",
    emoji: "🖤",
    description: "Тёмное плотное пиво с нотами шоколада, кофе и жжёного солода. От сухого до сливочного.",
    abvRange: "4-8%",
    ibuRange: "25-50",
  },
  "lager": {
    name: "Lager",
    emoji: "✨",
    description: "Светлое чистое пиво, ферментированное при низких температурах. Мягкий вкус с хрустящим финишем.",
    abvRange: "4-5.5%",
    ibuRange: "10-25",
  },
  "wheat beer": {
    name: "Wheat Beer",
    emoji: "🌾",
    description: "Пшеничное пиво с мягкой текстурой и нотами банана, гвоздики и ванили. Мутноватое и освежающее.",
    abvRange: "4-5.5%",
    ibuRange: "10-20",
  },
  "porter": {
    name: "Porter",
    emoji: "🪵",
    description: "Тёмный эль с нотами карамели, тёмного хлеба и лёгкой дымностью. Мягче стаута.",
    abvRange: "4.5-6.5%",
    ibuRange: "20-35",
  },
  "sour": {
    name: "Sour",
    emoji: "🍋",
    description: "Кислые сорта пива с широким спектром вкусов: от фруктовых до землистых. Часто с добавками фруктов.",
    abvRange: "3-7%",
    ibuRange: "5-15",
  },
  "pilsner": {
    name: "Pilsner",
    emoji: "🌟",
    description: "Богатый лагер с яркой хмелевой горечью и сухим финишем. Чешская и немецкая школы.",
    abvRange: "4-5%",
    ibuRange: "25-45",
  },
  "belgian": {
    name: "Belgian",
    emoji: "🏛️",
    description: "Бельгийские сорта — от лёгких Witbier до крепких Tripel и Quadrupel. Сложные фруктовые эфиры.",
    abvRange: "4.5-12%",
    ibuRange: "15-35",
  },
  "pale ale": {
    name: "Pale Ale",
    emoji: "🌸",
    description: "Светлый эль с балансом солода и хмеля. Фруктовые и цветочные ноты, умеренная горечь.",
    abvRange: "4.5-6.5%",
    ibuRange: "30-50",
  },
  "amber ale": {
    name: "Amber Ale",
    emoji: "🟤",
    description: "Янтарный эль с карамельным солодовым вкусом. Мягкая горечь и сухофруктовые ноты.",
    abvRange: "4.5-6.5%",
    ibuRange: "20-35",
  },
  "brown ale": {
    name: "Brown Ale",
    emoji: "🌰",
    description: "Коричневый эль с нотами ореха, карамели и шоколада. Мягкий и сытный.",
    abvRange: "4-6%",
    ibuRange: "15-30",
  },
  "barleywine": {
    name: "Barleywine",
    emoji: "🍷",
    description: "Крепкий ячменный эль с виноподобной текстурой. Ноты сухофруктов, карамели и дуба.",
    abvRange: "8-14%",
    ibuRange: "40-100",
  },
};

export function getStyleInfo(style: string): StyleInfoData | null {
  const key = style.toLowerCase();
  // Check exact match first
  if (beerStyles[key]) return beerStyles[key];
  // Check partial match
  for (const [k, v] of Object.entries(beerStyles)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}