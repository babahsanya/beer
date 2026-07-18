import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchLimiter, getClientIp } from '@/lib/rate-limit';

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
    // Rate limit
    const ip = getClientIp(request);
    const rl = searchLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ suggestions: [], styles: [] });
    }

    const q = request.nextUrl.searchParams.get('q') || '';

    if (!q.trim() || q.trim().length < 2 || q.length > 200) {
      return NextResponse.json({ suggestions: [], styles: [] });
    }

    const qLower = q.trim().toLowerCase();
    const escapedQ = qLower.replace(/!/g, '!!').replace(/%/g, '!%').replace(/_/g, '!_');
    const ESC = " ESCAPE '!'";
    const prefix = `${escapedQ}%`;
    const contains = `%${escapedQ}%`;

    // Check for Russian aliases
    const englishAliases: string[] = [];
    for (const [ru, en] of Object.entries(RU_EN_ALIASES)) {
      if (qLower.includes(ru) || ru.startsWith(qLower)) {
        englishAliases.push(en);
      }
    }
    const aliasPrefixes = englishAliases.map((en) => `${en}%`);
    const aliasContains = englishAliases.map((en) => `%${en}%`);

    // Build conditions
    const nameConditions = [
      `LOWER("name") LIKE ?${ESC}`,
      `LOWER("name") LIKE ?${ESC}`,
    ];
    const nameParams: unknown[] = [prefix, contains];

    for (const ap of aliasPrefixes) {
      nameConditions.push(`LOWER("name") LIKE ?${ESC}`);
      nameParams.push(ap);
    }
    for (const ac of aliasContains) {
      nameConditions.push(`LOWER("name") LIKE ?${ESC}`);
      nameParams.push(ac);
    }

    const styleConditions = [
      `LOWER("style") LIKE ?${ESC}`,
      `LOWER("style") LIKE ?${ESC}`,
    ];
    const styleParams: unknown[] = [prefix, contains];

    for (const ap of aliasPrefixes) {
      styleConditions.push(`LOWER("style") LIKE ?${ESC}`);
      styleParams.push(ap);
    }
    for (const ac of aliasContains) {
      styleConditions.push(`LOWER("style") LIKE ?${ESC}`);
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