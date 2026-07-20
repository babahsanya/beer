import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeLimiter, getClientIp } from '@/lib/rate-limit';
import {
  apiSuccess,
  apiError,
  apiBadRequest,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from '@/lib/api';

// 5 MB hard limit on import payload. Checked before reading the body.
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

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

/**
 * POST /api/import
 *
 * Restores a previously exported BeerID backup into the authenticated user's
 * account. Hard-limited to 5 MB to keep the request body bounded. All writes
 * are scoped to the calling user — userId is forced server-side and never
 * read from the import payload.
 *
 * Concurrency model:
 *  - favorites / viewHistory / achievements: `upsert` by compound unique key
 *    (race-safe, idempotent — re-importing the same backup is a no-op).
 *  - tastingJournal / searchHistory: `createMany` with `skipDuplicates`
 *    (these tables have no natural compound key, so we rely on PK de-dup).
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests();
    }

    const userOrRes = await requireUser();
    if (userOrRes instanceof NextResponse) return userOrRes;
    const user = userOrRes;

    // Hard 5MB limit — check Content-Length before we even read the body.
    const contentLength = parseInt(
      request.headers.get('content-length') || '0',
      10,
    );
    if (contentLength > MAX_IMPORT_BYTES) {
      return apiError(
        `Файл слишком большой (максимум ${MAX_IMPORT_BYTES / 1024 / 1024} МБ)`,
        'PAYLOAD_TOO_LARGE',
        413,
      );
    }

    const raw = await request.text();
    // Double-check actual byte length — Content-Length is client-controlled
    // and may be missing or lying.
    if (Buffer.byteLength(raw) > MAX_IMPORT_BYTES) {
      return apiError(
        `Файл слишком большой (максимум ${MAX_IMPORT_BYTES / 1024 / 1024} МБ)`,
        'PAYLOAD_TOO_LARGE',
        413,
      );
    }

    let data: ExportData;
    try {
      data = JSON.parse(raw);
    } catch {
      return apiBadRequest('Неверный формат JSON');
    }

    if (!data.version) {
      return apiBadRequest(
        'Файл не содержит версию. Убедитесь, что это корректный бэкап BeerID.',
      );
    }

    const errors: string[] = [];
    const skipped = {
      favorites: 0,
      tastings: 0,
      viewHistory: 0,
      searchHistory: 0,
      achievements: 0,
    };
    const imported = {
      favorites: 0,
      tastings: 0,
      viewHistory: 0,
      searchHistory: 0,
      achievements: 0,
    };

    await db.$transaction(async (tx) => {
      // --- Favorites: upsert by [userId, beerId] ---
      if (Array.isArray(data.favorites)) {
        for (const fav of data.favorites) {
          try {
            if (!fav.beerId) {
              skipped.favorites++;
              continue;
            }
            const beerExists = await tx.beer.findUnique({
              where: { id: fav.beerId },
              select: { id: true },
            });
            if (!beerExists) {
              errors.push(`Избранное: пиво ${fav.beerId} не найдено`);
              skipped.favorites++;
              continue;
            }
            await tx.favorite.upsert({
              where: { userId_beerId: { userId: user.id, beerId: fav.beerId } },
              create: {
                userId: user.id,
                beerId: fav.beerId,
                createdAt: fav.createdAt ? new Date(fav.createdAt) : undefined,
              },
              // Don't touch an existing favorite — import is idempotent.
              update: {},
            });
            imported.favorites++;
          } catch {
            errors.push(`Избранное: ошибка для beerId=${fav.beerId}`);
            skipped.favorites++;
          }
        }
      }

      // --- Tasting Journal: createMany with skipDuplicates ---
      // No compound unique key on TastingEntry, so we lean on the PK and
      // skipDuplicates to absorb re-imports of the same backup file.
      if (Array.isArray(data.tastingJournal)) {
        const validRecords = data.tastingJournal.filter((t) => {
          if (!t.beerName) {
            skipped.tastings++;
            return false;
          }
          return true;
        });

        if (validRecords.length > 0) {
          try {
            const result = await tx.tastingEntry.createMany({
              data: validRecords.map((t) => {
                const createdDate = t.createdAt ? new Date(t.createdAt) : new Date();
                return {
                  userId: user.id,
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
                };
              }),
              skipDuplicates: true,
            });
            imported.tastings += result.count;
            skipped.tastings += validRecords.length - result.count;
          } catch {
            errors.push('Журнал дегустаций: ошибка массовой вставки');
            skipped.tastings += validRecords.length;
          }
        }
      }

      // --- View History: upsert by [userId, beerId] ---
      if (Array.isArray(data.viewHistory)) {
        for (const v of data.viewHistory) {
          try {
            if (!v.beerId) {
              skipped.viewHistory++;
              continue;
            }
            const createdDate = v.createdAt ? new Date(v.createdAt) : new Date();
            await tx.viewHistory.upsert({
              where: { userId_beerId: { userId: user.id, beerId: v.beerId } },
              create: {
                userId: user.id,
                beerId: v.beerId,
                beerName: v.beerName || '',
                createdAt: createdDate,
              },
              // Don't overwrite an existing record's timestamp on import.
              update: {},
            });
            imported.viewHistory++;
          } catch {
            errors.push(`История просмотров: ошибка для beerId=${v.beerId}`);
            skipped.viewHistory++;
          }
        }
      }

      // --- Search History: createMany with skipDuplicates ---
      if (Array.isArray(data.searchHistory)) {
        const validRecords = data.searchHistory.filter((s) => {
          if (!s.query) {
            skipped.searchHistory++;
            return false;
          }
          return true;
        });

        if (validRecords.length > 0) {
          try {
            const result = await tx.searchHistory.createMany({
              data: validRecords.map((s) => ({
                userId: user.id,
                query: s.query,
                resultCount: s.resultCount ?? 0,
                createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
              })),
              skipDuplicates: true,
            });
            imported.searchHistory += result.count;
            skipped.searchHistory += validRecords.length - result.count;
          } catch {
            errors.push('История поиска: ошибка массовой вставки');
            skipped.searchHistory += validRecords.length;
          }
        }
      }

      // --- Achievements: upsert by [userId, key] WITHOUT overwriting progress ---
      if (Array.isArray(data.achievements)) {
        for (const a of data.achievements) {
          try {
            if (!a.key) {
              skipped.achievements++;
              continue;
            }
            await tx.userAchievement.upsert({
              where: { userId_key: { userId: user.id, key: a.key } },
              create: {
                userId: user.id,
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
              // Intentionally empty — never overwrite existing progress.
              update: {},
            });
            imported.achievements++;
          } catch {
            errors.push(`Достижение: ошибка для key="${a.key}"`);
            skipped.achievements++;
          }
        }
      }
    });

    return apiSuccess({ imported, skipped, errors });
  } catch (error) {
    console.error('Import error:', error);
    return apiInternalError('Ошибка при импорте данных');
  }
}
