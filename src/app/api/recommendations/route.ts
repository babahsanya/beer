import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';
import { apiSuccess, apiTooManyRequests, apiInternalError } from '@/lib/api';

interface BeerRow {
  id: string;
  name: string;
  style: string;
  abv: number;
  ibu: number;
  country: string;
  brewery: string;
  description: string;
  label: string;
  rating: number;
  ratingCount: number;
  totalCheckins: number;
  monthlyCheckins: number;
  dailyCheckins: number;
  source: string;
  score: number | string | bigint;
}

interface RecommendationBeer {
  id: string;
  name: string;
  style: string;
  abv: number;
  ibu: number;
  country: string;
  brewery: string;
  description: string;
  label: string;
  rating: number;
  ratingCount: number;
  totalCheckins: number;
  monthlyCheckins: number;
  dailyCheckins: number;
  source: string;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Fisher–Yates shuffle — unbiased, O(n). The previous code used
 * `arr.sort(() => Math.random() - 0.5)` which is biased (the comparator
 * isn't transitive so the resulting order depends on the JS engine's sort
 * implementation).
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function rowToBeer(row: BeerRow): RecommendationBeer {
  return {
    id: row.id,
    name: row.name,
    style: row.style,
    abv: row.abv,
    ibu: row.ibu,
    country: row.country,
    brewery: row.brewery,
    description: row.description,
    label: row.label,
    rating: row.rating,
    ratingCount: row.ratingCount,
    totalCheckins: row.totalCheckins,
    monthlyCheckins: row.monthlyCheckins,
    dailyCheckins: row.dailyCheckins,
    source: row.source,
  };
}

/**
 * GET /api/recommendations
 *
 * Recommendations are computed entirely in SQL (CASE WHEN scoring with
 * Postgres ARRAY operators) so we don't have to load the entire Beer table
 * into JS just to filter it. Falls back to "popular beers" when the user
 * has no favorites (or is anonymous).
 *
 * Stage 4.2 of the audit recovery.
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests(
        'Слишком много запросов',
        Math.ceil((rl.resetAt - Date.now()) / 1000),
      );
    }

    // Scope by authenticated user. Anonymous users get the "popular"
    // fallback below.
    const session = await auth();
    const userId = session?.user?.id;

    // ─── Anonymous / no-favorites path: top-rated beers, shuffled ─────────
    if (!userId) {
      const topBeers = await db.beer.findMany({
        orderBy: { rating: 'desc' },
        take: 20,
      });
      const shuffled = shuffleArray(topBeers).slice(0, 5);
      const recommendations = shuffled.map((beer) => ({
        beer: {
          id: beer.id,
          name: beer.name,
          style: beer.style,
          abv: beer.abv,
          ibu: beer.ibu,
          country: beer.country,
          brewery: beer.brewery,
          description: beer.description,
          label: beer.label,
          rating: beer.rating,
          ratingCount: beer.ratingCount,
          totalCheckins: beer.totalCheckins,
          monthlyCheckins: beer.monthlyCheckins,
          dailyCheckins: beer.dailyCheckins,
          source: beer.source,
        },
        reason: 'Популярное пиво',
        score: 0,
      }));
      return apiSuccess({ recommendations });
    }

    // ─── Personalised path: SQL-side scoring ─────────────────────────────
    //
    // Gather the user's preferred styles/countries from their favorites,
    // then score every beer (excluding favorites) in one SQL round-trip
    // using CASE WHEN + Postgres ARRAY operators. The previous code did
    // `db.beer.findMany({ where: { id: { notIn: favorites } } })` and then
    // scored everything in JS — that's a full table scan + N JS objects.

    const favorites = await db.favorite.findMany({
      where: { userId },
      select: { beer: { select: { style: true, country: true } } },
    });

    if (favorites.length === 0) {
      // Logged-in but no favorites yet — fall back to popular.
      const topBeers = await db.beer.findMany({
        orderBy: { rating: 'desc' },
        take: 20,
      });
      const shuffled = shuffleArray(topBeers).slice(0, 5);
      const recommendations = shuffled.map((beer) => ({
        beer: {
          id: beer.id,
          name: beer.name,
          style: beer.style,
          abv: beer.abv,
          ibu: beer.ibu,
          country: beer.country,
          brewery: beer.brewery,
          description: beer.description,
          label: beer.label,
          rating: beer.rating,
          ratingCount: beer.ratingCount,
          totalCheckins: beer.totalCheckins,
          monthlyCheckins: beer.monthlyCheckins,
          dailyCheckins: beer.dailyCheckins,
          source: beer.source,
        },
        reason: 'Популярное пиво',
        score: 0,
      }));
      return apiSuccess({ recommendations });
    }

    const preferredStyles = Array.from(
      new Set(favorites.map((f) => f.beer.style).filter(Boolean)),
    );
    const preferredCountries = Array.from(
      new Set(favorites.map((f) => f.beer.country).filter(Boolean)),
    );

    // $1, $2 are Postgres array literals. We pass them as JS arrays and
    // Prisma handles the binding via tagged template.
    const rows = (await db.$queryRaw`
      SELECT b.*,
        (CASE WHEN b.style = ANY(${preferredStyles}::text[]) THEN 2 ELSE 0 END
       + CASE WHEN b.country = ANY(${preferredCountries}::text[]) THEN 1 ELSE 0 END
       + CASE WHEN b.rating >= 3.8 THEN 1 ELSE 0 END) AS score
      FROM "Beer" b
      WHERE b.id NOT IN (
        SELECT "beerId" FROM "Favorite" WHERE "userId" = ${userId}
      )
      ORDER BY score DESC, b.rating DESC, RANDOM()
      LIMIT 8
    `) as BeerRow[];

    // Build reason text based on which scoring bucket matched. We re-check
    // the row's style/country against the preferred sets in JS so the
    // message matches the actual recommendation.
    const stylesSet = new Set(preferredStyles);
    const countriesSet = new Set(preferredCountries);
    const recommendations = rows.map((row) => {
      const score = toNumber(row.score);
      let reason: string;
      if (stylesSet.has(row.style)) {
        reason = `Тот же стиль: ${row.style}`;
      } else if (countriesSet.has(row.country)) {
        reason = `Из ${row.country}, как в вашем избранном`;
      } else if (row.rating >= 3.8) {
        reason = `Высокий рейтинг: ${row.rating.toFixed(1)}`;
      } else {
        reason = 'Рекомендуем попробовать';
      }
      return {
        beer: rowToBeer(row),
        reason,
        score,
      };
    });

    return apiSuccess({ recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    return apiInternalError('Ошибка при загрузке рекомендаций');
  }
}
