import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeLimiter, getClientIp } from '@/lib/rate-limit';

interface ExportData {
  version?: string;
  favorites?: Array<{
    beerId: string;
    createdAt: string;
  }>;
  tastingJournal?: Array<{
    beerId: string;
    beerName: string;
    beerStyle: string;
    brewery: string;
    abv: number;
    country: string;
    personalRating: number;
    aroma: number;
    taste: number;
    appearance: number;
    mouthfeel: number;
    comment: string;
    location: string;
    glassType: string;
    wouldBuyAgain: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  viewHistory?: Array<{
    beerId: string;
    beerName: string;
    createdAt: string;
  }>;
  searchHistory?: Array<{
    query: string;
    resultCount: number;
    createdAt: string;
  }>;
  achievements?: Array<{
    key: string;
    title: string;
    description: string;
    icon: string;
    progress: number;
    target: number;
    unlockedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const raw = await request.text();
    let data: ExportData;

    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'Неверный формат JSON' },
        { status: 400 }
      );
    }

    if (!data.version) {
      return NextResponse.json(
        { error: 'Файл не содержит версию. Убедитесь, что это корректный бэкап BeerID.' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let importedFavorites = 0;
    let importedTastings = 0;
    let importedViewHistory = 0;
    let importedSearchHistory = 0;
    let importedAchievements = 0;

    await db.$transaction(async (tx) => {
      // --- Favorites: upsert by beerId ---
      if (Array.isArray(data.favorites)) {
        for (const fav of data.favorites) {
          try {
            if (!fav.beerId) continue;
            // Check beer exists
            const beerExists = await tx.beer.findUnique({
              where: { id: fav.beerId },
              select: { id: true },
            });
            if (!beerExists) {
              errors.push(`Избранное: пиво ${fav.beerId} не найдено`);
              continue;
            }
            // Upsert: avoid duplicate by beerId
            const existing = await tx.favorite.findFirst({
              where: { beerId: fav.beerId },
            });
            if (existing) continue; // skip duplicate

            await tx.favorite.create({
              data: {
                beerId: fav.beerId,
                createdAt: fav.createdAt ? new Date(fav.createdAt) : undefined,
              },
            });
            importedFavorites++;
          } catch (e) {
            errors.push(`Избранное: ошибка для beerId=${fav.beerId}`);
          }
        }
      }

      // --- Tasting Journal: create (dedupe by beerName+createdAt) ---
      if (Array.isArray(data.tastingJournal)) {
        for (const t of data.tastingJournal) {
          try {
            if (!t.beerName) continue;
            const createdDate = t.createdAt ? new Date(t.createdAt) : new Date();
            // Simple dedupe: check if a tasting with same beerName and very close timestamp exists
            const existing = await tx.tastingEntry.findFirst({
              where: {
                beerName: t.beerName,
                createdAt: {
                  gte: new Date(createdDate.getTime() - 1000),
                  lte: new Date(createdDate.getTime() + 1000),
                },
              },
            });
            if (existing) continue;

            await tx.tastingEntry.create({
              data: {
                beerId: t.beerId || '',
                beerName: t.beerName,
                beerStyle: t.beerStyle || '',
                brewery: t.brewery || '',
                abv: t.abv ?? 0,
                country: t.country || '',
                personalRating: t.personalRating ?? 0,
                aroma: t.aroma ?? 0,
                taste: t.taste ?? 0,
                appearance: t.appearance ?? 0,
                mouthfeel: t.mouthfeel ?? 0,
                comment: t.comment || '',
                location: t.location || '',
                glassType: t.glassType || '',
                wouldBuyAgain: t.wouldBuyAgain ?? false,
                createdAt: createdDate,
                updatedAt: t.updatedAt ? new Date(t.updatedAt) : createdDate,
              },
            });
            importedTastings++;
          } catch (e) {
            errors.push(`Журнал: ошибка для "${t.beerName}"`);
          }
        }
      }

      // --- View History: create (dedupe by beerId+createdAt within 1s) ---
      if (Array.isArray(data.viewHistory)) {
        for (const v of data.viewHistory) {
          try {
            if (!v.beerId) continue;
            const createdDate = v.createdAt ? new Date(v.createdAt) : new Date();
            const existing = await tx.viewHistory.findFirst({
              where: {
                beerId: v.beerId,
                createdAt: {
                  gte: new Date(createdDate.getTime() - 1000),
                  lte: new Date(createdDate.getTime() + 1000),
                },
              },
            });
            if (existing) continue;

            await tx.viewHistory.create({
              data: {
                beerId: v.beerId,
                beerName: v.beerName || '',
                createdAt: createdDate,
              },
            });
            importedViewHistory++;
          } catch (e) {
            errors.push(`История просмотров: ошибка для beerId=${v.beerId}`);
          }
        }
      }

      // --- Search History: create (dedupe by query+createdAt within 1s) ---
      if (Array.isArray(data.searchHistory)) {
        for (const s of data.searchHistory) {
          try {
            if (!s.query) continue;
            const createdDate = s.createdAt ? new Date(s.createdAt) : new Date();
            const existing = await tx.searchHistory.findFirst({
              where: {
                query: s.query,
                createdAt: {
                  gte: new Date(createdDate.getTime() - 1000),
                  lte: new Date(createdDate.getTime() + 1000),
                },
              },
            });
            if (existing) continue;

            await tx.searchHistory.create({
              data: {
                query: s.query,
                resultCount: s.resultCount ?? 0,
                createdAt: createdDate,
              },
            });
            importedSearchHistory++;
          } catch (e) {
            errors.push(`История поиска: ошибка для "${s.query}"`);
          }
        }
      }

      // --- Achievements: upsert by key ---
      if (Array.isArray(data.achievements)) {
        for (const a of data.achievements) {
          try {
            if (!a.key) continue;
            await tx.userAchievement.upsert({
              where: { key: a.key },
              create: {
                key: a.key,
                title: a.title || '',
                description: a.description || '',
                icon: a.icon || '🍺',
                progress: a.progress ?? 0,
                target: a.target ?? 1,
                unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : null,
                createdAt: a.createdAt ? new Date(a.createdAt) : undefined,
                updatedAt: a.updatedAt ? new Date(a.updatedAt) : undefined,
              },
              update: {
                title: a.title || undefined,
                description: a.description || undefined,
                icon: a.icon || undefined,
                progress: a.progress ?? undefined,
                target: a.target ?? undefined,
                unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : null,
                updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
              },
            });
            importedAchievements++;
          } catch (e) {
            errors.push(`Достижение: ошибка для key="${a.key}"`);
          }
        }
      }
    });

    return NextResponse.json({
      imported: {
        favorites: importedFavorites,
        tastings: importedTastings,
        viewHistory: importedViewHistory,
        searchHistory: importedSearchHistory,
        achievements: importedAchievements,
      },
      errors,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Ошибка при импорте данных' },
      { status: 500 }
    );
  }
}