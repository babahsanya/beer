import { NextRequest, NextResponse } from 'next/server';
import { readLimiter, getClientIp } from '@/lib/rate-limit';
import { getBeerInfo, getBeerCheckins, normalizeUntappdBeer, isUntappdAvailable } from '@/lib/untappd';

/**
 * GET /api/beers/untappd/[id]
 *
 * Fetches detailed info for an Untappd beer by its numeric ID.
 * Returns normalized beer data + recent checkins.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const { id: rawId } = await params;
    const beerId = parseInt(rawId, 10);

    if (!beerId || beerId < 1) {
      return NextResponse.json({ error: 'Некорректный ID пива' }, { status: 400 });
    }

    if (!(await isUntappdAvailable())) {
      return NextResponse.json({ error: 'Untappd API не настроен. Задайте UNTAPPD_CLIENT_ID и UNTAPPD_CLIENT_SECRET.' }, { status: 503 });
    }

    const [beerData, checkins] = await Promise.all([
      getBeerInfo(beerId),
      getBeerCheckins(beerId, 10),
    ]);

    if (!beerData) {
      return NextResponse.json({ error: 'Пиво не найдено в Untappd' }, { status: 404 });
    }

    const beer = normalizeUntappdBeer(beerData);

    return NextResponse.json({
      beer,
      checkins: (checkins || []).map(c => ({
        id: c.checkin_id,
        rating: c.rating_score || 0,
        comment: (c.comment || '').slice(0, 500),
        userName: c.user?.user_name || 'Аноним',
        userAvatar: c.user?.user_avatar || '',
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    console.error('Untappd beer info error:', error);
    return NextResponse.json({ error: 'Ошибка загрузки данных из Untappd' }, { status: 500 });
  }
}