import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';
import {
  apiSuccess,
  apiNotFound,
  apiTooManyRequests,
  apiInternalError,
} from '@/lib/api';

/**
 * GET /api/beers/random
 *
 * Returns one random beer. Optional `?style=<style>` narrows the pool to
 * beers whose style contains the given string.
 *
 * Stage 4.6 of the audit recovery: replaced `findMany` (which loaded
 * every beer matching the style filter) with `count({ where })` → random
 * `skip` → `findFirst({ skip })`.
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

    const { searchParams } = new URL(request.url);
    const rawStyle = searchParams.get('style');
    // Cap style filter — protects against giant query strings.
    const style = rawStyle && rawStyle.length <= 100 ? rawStyle : undefined;

    let beer;

    if (style) {
      const where = {
        style: { contains: style },
      };
      const matchingCount = await db.beer.count({ where });
      if (matchingCount === 0) {
        return apiNotFound('Пиво не найдено');
      }
      const skip = Math.floor(Math.random() * matchingCount);
      beer = await db.beer.findFirst({
        where,
        skip,
        include: { _count: { select: { reviews: true } } },
      });
    } else {
      const totalBeers = await db.beer.count();
      if (totalBeers === 0) {
        return apiNotFound('Пиво не найдено');
      }
      const skip = Math.floor(Math.random() * totalBeers);
      beer = await db.beer.findFirst({
        skip,
        include: { _count: { select: { reviews: true } } },
      });
    }

    if (!beer) {
      return apiNotFound('Пиво не найдено');
    }

    // Strip the _count aggregate — clients expect a flat Beer shape with
    // a `reviewCount` field instead.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _count, ...rest } = beer;
    return apiSuccess({
      ...rest,
      reviewCount: _count.reviews,
    });
  } catch (error) {
    console.error('Random beer API error:', error);
    return apiInternalError('Ошибка загрузки');
  }
}
