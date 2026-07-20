/**
 * Shared helpers for beer search.
 *
 * Used by:
 *   - src/app/api/beers/search/route.ts
 *   - src/app/api/beers/suggestions/route.ts
 *
 * Extracted in Stage 5 of the audit recovery (the two routes had identical
 * copies of `RU_EN_ALIASES` and `escapeLike` before).
 */

/** Escape LIKE wildcards (!, %, _) so a user-typed string is treated literally. */
export function escapeLike(str: string): string {
  return str
    .replace(/!/g, "!!")
    .replace(/%/g, "!%")
    .replace(/_/g, "!_");
}

/**
 * Russian → English beer-style aliases. The local DB stores style names in
 * English ("Stout", "IPA", ...) but users type in Russian ("стаут", "ипа").
 * For each query we expand it into a set of English terms that should also
 * be matched against the DB.
 */
export const RU_EN_ALIASES: Record<string, string> = {
  стаут: "stout",
  ипа: "ipa",
  лагер: "lager",
  эль: "ale",
  пшеничн: "wheat",
  бельгийск: "belgian",
  американск: "american",
  имперск: "imperial",
  портер: "porter",
  кислый: "sour",
  трипель: "tripel",
  пилснер: "pilsner",
  вайсбир: "witbier",
  "тёмн": "dark",
  "тёмные": "dark",
  креп: "strong",
  рис: "rice",
  фрукт: "fruit",
  овсян: "oatmeal",
  пале: "pale",
  дабл: "double",
  квдрупель: "quadrupel",
  сезон: "saison",
  кольш: "kolsch",
  коьш: "kolsch",
  лэмбик: "lambic",
  сессион: "session",
  виенн: "vienna",
  советск: "soviet",
  европейск: "european",
  яг: "ipa",
  стауд: "stout",
  дозер: "dozer",
  корона: "corona",
  хайнекен: "heineken",
  гиннесс: "guinness",
  будвайзер: "budweiser",
  стопка: "stout",
  вайс: "wheat",
  дюбель: "dubbel",
  пивовар: "brewery",
  пивоварен: "brewery",
};

/**
 * For the given query, return the set of English alias terms that should
 * also be matched (e.g. searching for "стаут" should also find "stout").
 *
 * Returns a de-duplicated array. The match is bidirectional: if the query
 * contains a Russian alias OR if the query is a prefix of a Russian alias
 * (e.g. user typed "ста" → matches "стаут"), we expand.
 */
export function expandAliases(query: string): string[] {
  const queryLower = query.toLowerCase();
  const terms = new Set<string>();
  for (const [ru, en] of Object.entries(RU_EN_ALIASES)) {
    if (queryLower.includes(ru) || ru.startsWith(queryLower)) {
      terms.add(en);
    }
  }
  return Array.from(terms);
}
