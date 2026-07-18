import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiLimiter, getClientIp } from '@/lib/rate-limit';
import { searchBreweriesCached, isAvailable as isOBDAvailable, getCountryFlag, localizeBreweryType } from '@/lib/brewerydb';
import { searchBeers, normalizeUntappdBeer, isUntappdAvailable } from '@/lib/untappd';

const MAX_IMAGE_BASE64_LENGTH = 2_800_000;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/recognize
 *
 * Supports:
 * 1. { text: "beer name" } — searches OBD (breweries) + Untappd (if configured) + local DB
 * 2. { image: base64 } — returns message that image recognition requires a VLM provider
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = aiLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Подождите.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await request.json();
    const { image, text } = body as { image?: string; text?: string };

    // --- Text-based search ---
    if (text && typeof text === 'string') {
      const query = text.trim().slice(0, 200);
      if (query.length < 2) {
        return NextResponse.json({ error: 'Введите минимум 2 символа' }, { status: 400 });
      }

      const results: Array<Record<string, unknown>> = [];
      let method = 'local';

      // 1) Local DB
      const localMatches = await db.beer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { brewery: { contains: query, mode: 'insensitive' } },
            { style: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { rating: 'desc' },
        take: 5,
      });

      for (const beer of localMatches) {
        results.push({ ...beer, confidence: 95, _source: 'local', _type: 'beer' });
      }

      // 2) Open Brewery DB (always available, no key)
      if (results.length < 5 && await isOBDAvailable()) {
        const breweries = await searchBreweriesCached(query, 5);
        for (const b of breweries) {
          if (results.some(r => String(r.name).toLowerCase() === b.name.toLowerCase())) continue;
          results.push({
            id: `obd-${b.id}`,
            name: b.name,
            style: localizeBreweryType(b.brewery_type),
            abv: 0, ibu: 0,
            country: `${getCountryFlag(b.country)} ${b.country}`,
            brewery: b.name,
            description: [b.street, b.postal_code, b.city, b.state_province, b.country].filter(Boolean).join(', '),
            label: '',
            rating: 0, ratingCount: 0,
            totalCheckins: 0, monthlyCheckins: 0, dailyCheckins: 0,
            source: 'openbrewerydb', _source: 'online', _type: 'brewery',
            confidence: 70,
            city: b.city,
            website: b.website_url,
            breweryType: b.brewery_type,
            lat: b.latitude, lng: b.longitude,
          });
          method = 'openbrewerydb';
        }
      }

      // 3) Untappd (if configured)
      if (results.length < 5 && await isUntappdAvailable()) {
        const items = await searchBeers(query, 5);
        for (const item of items) {
          if (results.some(r => String(r.name).toLowerCase() === item.beer.beer_name.toLowerCase())) continue;
          const normalized = normalizeUntappdBeer(item);
          results.push({ ...normalized, confidence: 90, _type: 'beer' });
          method = 'untappd';
        }
      }

      return NextResponse.json({ matches: results.slice(0, 5), method });
    }

    // --- Image-based (VLM not available outside sandbox) ---
    if (image && typeof image === 'string') {
      if (image.length > MAX_IMAGE_BASE64_LENGTH) {
        return NextResponse.json({ error: 'Изображение слишком большое (макс 2 МБ)' }, { status: 400 });
      }
      if (image.length < 100) {
        return NextResponse.json({ error: 'Изображение повреждено' }, { status: 400 });
      }

      return NextResponse.json({
        matches: [],
        vlmResult: null,
        message: 'Распознавание по фото требует подключения VLM-провайдера (Google Vision, AWS Rekognition). Попробуйте текстовый поиск по названию пива.',
      });
    }

    return NextResponse.json(
      { error: 'Укажите "text" (название пива) или "image" (base64 фото)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Recognize error:', error);
    return NextResponse.json({ error: 'Ошибка при распознавании' }, { status: 500 });
  }
}