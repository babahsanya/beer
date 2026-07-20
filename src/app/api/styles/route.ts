import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';
import { apiSuccess, apiTooManyRequests, apiInternalError } from '@/lib/api';

/**
 * GET /api/styles
 *
 * Returns aggregated per-style metadata: count, average rating, and an
 * example beer per style.
 *
 * Stage 4.4 of the audit recovery: replaced `findMany` + JS Map with
 * `db.beer.groupBy` for the counts + averages (one SQL round-trip), and
 * runs parallel `findFirst` queries for example beers per style.
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

    const grouped = await db.beer.groupBy({
      by: ['style'],
      _count: { id: true },
      _avg: { rating: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Parallel fetch of one example beer per style. Cap concurrency with
    // a Promise.all — the number of styles is small (<50).
    const examples = await Promise.all(
      grouped.map((g) =>
        db.beer.findFirst({
          where: { style: g.style },
          orderBy: { rating: 'desc' },
          select: { name: true, id: true },
        }),
      ),
    );

    const styles = grouped.map((g, i) => ({
      style: g.style,
      count: g._count.id,
      avgRating: Math.round((g._avg.rating ?? 0) * 100) / 100,
      exampleBeer: examples[i]?.name ?? '',
      exampleBeerId: examples[i]?.id ?? '',
    }));

    return apiSuccess(styles);
  } catch (error) {
    console.error('Styles API error:', error);
    return apiInternalError('Ошибка загрузки');
  }
}
