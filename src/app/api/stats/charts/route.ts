import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';
import { apiSuccess, apiTooManyRequests, apiInternalError } from '@/lib/api';

interface ChartsRow {
  styleRatings: { style: string; avgRating: number; count: number }[];
  abvBuckets: Array<{
    "0_3": bigint | number;
    "3_5": bigint | number;
    "5_7": bigint | number;
    "7_10": bigint | number;
    "10_plus": bigint | number;
  }>;
  ibuBuckets: Array<{
    "0_20": bigint | number;
    "20_40": bigint | number;
    "40_60": bigint | number;
    "60_80": bigint | number;
    "80_100": bigint | number;
    "100_plus": bigint | number;
  }>;
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
 * GET /api/stats/charts
 *
 * Aggregated chart data for the analytics view. Stage 4.3 of the audit
 * recovery replaced the `findMany` + JS aggregation with a single SQL
 * query using `COUNT(*) FILTER (WHERE ...)` for all 11 ABV+IBU buckets,
 * plus parallel queries for the remaining datasets.
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

    // 4 independent queries run in parallel:
    //   1. ABV + IBU distribution in a single round-trip via
    //      `COUNT(*) FILTER (WHERE ...)` — 11 buckets total.
    //   2. Style ratings (avg + count) via groupBy.
    //   3. Country distribution (top 10) via groupBy.
    //   4. Top 10 rated beers via findMany with select.
    const [abvIbuRow, styleRatingsRaw, countryRaw, topRatedRaw] = await Promise.all([
      db.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE "abv" >= 0  AND "abv" < 3)  AS "0_3",
          COUNT(*) FILTER (WHERE "abv" >= 3  AND "abv" < 5)  AS "3_5",
          COUNT(*) FILTER (WHERE "abv" >= 5  AND "abv" < 7)  AS "5_7",
          COUNT(*) FILTER (WHERE "abv" >= 7  AND "abv" < 10) AS "7_10",
          COUNT(*) FILTER (WHERE "abv" >= 10)                AS "10_plus",

          COUNT(*) FILTER (WHERE "ibu" >= 0   AND "ibu" < 20)  AS "0_20",
          COUNT(*) FILTER (WHERE "ibu" >= 20  AND "ibu" < 40)  AS "20_40",
          COUNT(*) FILTER (WHERE "ibu" >= 40  AND "ibu" < 60)  AS "40_60",
          COUNT(*) FILTER (WHERE "ibu" >= 60  AND "ibu" < 80)  AS "60_80",
          COUNT(*) FILTER (WHERE "ibu" >= 80  AND "ibu" < 100) AS "80_100",
          COUNT(*) FILTER (WHERE "ibu" >= 100)                 AS "100_plus"
        FROM "Beer"
      ` as Promise<ChartsRow['abvBuckets']>,
      db.beer.groupBy({
        by: ['style'],
        _avg: { rating: true },
        _count: { id: true },
        orderBy: { _avg: { rating: 'desc' } },
      }),
      db.beer.groupBy({
        by: ['country'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      db.beer.findMany({
        orderBy: { rating: 'desc' },
        take: 10,
        select: { name: true, rating: true, style: true, brewery: true },
      }),
    ]);

    const abvRow = (abvIbuRow as unknown as ChartsRow['abvBuckets'][number])[0];
    const abvDistribution = [
      { range: '0–3%',  count: toNumber(abvRow?.['0_3']) },
      { range: '3–5%',  count: toNumber(abvRow?.['3_5']) },
      { range: '5–7%',  count: toNumber(abvRow?.['5_7']) },
      { range: '7–10%', count: toNumber(abvRow?.['7_10']) },
      { range: '10%+',   count: toNumber(abvRow?.['10_plus']) },
    ];
    const ibuDistribution = [
      { range: '0–20',   count: toNumber(abvRow?.['0_20']) },
      { range: '20–40',  count: toNumber(abvRow?.['20_40']) },
      { range: '40–60',  count: toNumber(abvRow?.['40_60']) },
      { range: '60–80',  count: toNumber(abvRow?.['60_80']) },
      { range: '80–100', count: toNumber(abvRow?.['80_100']) },
      { range: '100+',   count: toNumber(abvRow?.['100_plus']) },
    ];

    const styleRatings = styleRatingsRaw.map((s) => ({
      style: s.style,
      avgRating: Math.round((s._avg.rating ?? 0) * 100) / 100,
      count: s._count.id,
    }));

    const countryDistribution = countryRaw.map((c) => ({
      country: c.country,
      count: c._count.id,
    }));

    const topRated = topRatedRaw.map((b) => ({
      name: b.name,
      rating: Math.round(b.rating * 100) / 100,
      style: b.style,
      brewery: b.brewery,
    }));

    // Style popularity (sorted by count) — same groupBy as styleRatings but
    // ordered by count instead of avg rating.
    const stylePopularityRaw = await db.beer.groupBy({
      by: ['style'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    const stylePopularity = stylePopularityRaw.map((s) => ({
      style: s.style,
      count: s._count.id,
    }));

    return apiSuccess({
      styleRatings,
      abvDistribution,
      ibuDistribution,
      countryDistribution,
      topRated,
      stylePopularity,
    });
  } catch (error) {
    console.error('Charts API error:', error);
    return apiInternalError('Ошибка загрузки данных');
  }
}
