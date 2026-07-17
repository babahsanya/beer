import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Same alias map as search route
const RU_EN_ALIASES: Record<string, string> = {
  стаут: 'stout', ипа: 'ipa', лагер: 'lager', эль: 'ale',
  пшеничн: 'wheat', бельгийск: 'belgian', американск: 'american',
  имперск: 'imperial', портер: 'porter', кислый: 'sour',
  трипель: 'tripel', пилснер: 'pilsner', вайсбир: 'witbier',
  тёмн: 'dark', креп: 'strong', рис: 'rice', фрукт: 'fruit',
  овсян: 'oatmeal', пале: 'pale', дабл: 'double', квдрупель: 'quadrupel',
  сезон: 'saison', кольш: 'kolsch', коьш: 'kolsch', лэмбик: 'lambic',
  сессион: 'session', виенн: 'vienna', советск: 'soviet',
  европейск: 'european', яг: 'ipa', стауд: 'stout',
};

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';

    if (!q.trim() || q.trim().length < 2) {
      return NextResponse.json({ suggestions: [], styles: [] });
    }

    const qLower = q.trim().toLowerCase();
    const prefix = `${qLower}%`;
    const contains = `%${qLower}%`;

    // Check for Russian aliases (both: query contains alias key, OR query is prefix of alias key)
    const englishAliases: string[] = [];
    for (const [ru, en] of Object.entries(RU_EN_ALIASES)) {
      if (qLower.includes(ru) || ru.startsWith(qLower)) {
        englishAliases.push(en);
      }
    }
    const aliasPrefixes = englishAliases.map((en) => `${en}%`);
    const aliasContains = englishAliases.map((en) => `%${en}%`);

    // Build conditions: prefix match OR contains match OR alias match
    const nameConditions = [
      `LOWER("name") LIKE ?`,    // prefix
      `LOWER("name") LIKE ?`,    // contains (for short queries)
    ];
    const nameParams: unknown[] = [prefix, contains];

    for (const ap of aliasPrefixes) {
      nameConditions.push(`LOWER("name") LIKE ?`);
      nameParams.push(ap);
    }
    for (const ac of aliasContains) {
      nameConditions.push(`LOWER("name") LIKE ?`);
      nameParams.push(ac);
    }

    const styleConditions = [
      `LOWER("style") LIKE ?`,
      `LOWER("style") LIKE ?`,
    ];
    const styleParams: unknown[] = [prefix, contains];

    for (const ap of aliasPrefixes) {
      styleConditions.push(`LOWER("style") LIKE ?`);
      styleParams.push(ap);
    }
    for (const ac of aliasContains) {
      styleConditions.push(`LOWER("style") LIKE ?`);
      styleParams.push(ac);
    }

    const [nameResults, styleResults] = await Promise.all([
      db.$queryRawUnsafe(
        `SELECT DISTINCT "name" FROM "Beer" WHERE ${nameConditions.join(' OR ')} ORDER BY "rating" DESC LIMIT 5`,
        ...nameParams
      ) as Promise<Array<{ name: string }>>,
      db.$queryRawUnsafe(
        `SELECT DISTINCT "style" FROM "Beer" WHERE ${styleConditions.join(' OR ')} LIMIT 5`,
        ...styleParams
      ) as Promise<Array<{ style: string }>>,
    ]);

    return NextResponse.json({
      suggestions: nameResults.map((r) => r.name),
      styles: styleResults.map((r) => r.style),
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ suggestions: [], styles: [] });
  }
}