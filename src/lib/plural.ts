/**
 * Russian pluralization helper.
 *   plural(1, ["отзыв", "отзыва", "отзывов"])   → 'отзыв'
 *   plural(5, ["отзыв", "отзыва", "отзывов"])   → 'отзывов'
 *   plural(11, ["отзыв", "отзыва", "отзывов"])  → 'отзывов'
 */

export type PluralForms = readonly [string, string, string];

export const PLURAL_REVIEW: PluralForms = ["отзыв", "отзыва", "отзывов"];
export const PLURAL_BEER: PluralForms = ["пиво", "пива", "пив"];
export const PLURAL_STYLE: PluralForms = ["стиль", "стиля", "стилей"];
export const PLURAL_COUNTRY: PluralForms = ["страна", "страны", "стран"];
export const PLURAL_BREWERY: PluralForms = ["пивоварня", "пивоварни", "пивоварен"];
export const PLURAL_CHECKIN: PluralForms = ["чекин", "чекина", "чекинов"];
export const PLURAL_FAVORITE: PluralForms = ["избранное", "избранных", "избранных"];
export const PLURAL_YEAR: PluralForms = ["год", "года", "лет"];
export const PLURAL_MONTH: PluralForms = ["месяц", "месяца", "месяцев"];
export const PLURAL_DAY: PluralForms = ["день", "дня", "дней"];
export const PLURAL_HOUR: PluralForms = ["час", "часа", "часов"];
export const PLURAL_MINUTE: PluralForms = ["минута", "минуты", "минут"];
export const PLURAL_SECOND: PluralForms = ["секунда", "секунды", "секунд"];
export const PLURAL_QUIZ: PluralForms = ["вопрос", "вопроса", "вопросов"];

export function plural(n: number, forms: PluralForms): string {
  const abs = Math.abs(n);
  if (abs % 100 >= 11 && abs % 100 <= 14) {
    return forms[2];
  }
  const lastDigit = abs % 10;
  if (lastDigit === 1) return forms[0];
  if (lastDigit >= 2 && lastDigit <= 4) return forms[1];
  return forms[2];
}

export function formatWithPlural(n: number, forms: PluralForms): string {
  return `${n} ${plural(n, forms)}`;
}
