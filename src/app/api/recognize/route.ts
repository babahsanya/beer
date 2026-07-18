import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiLimiter, getClientIp } from '@/lib/rate-limit';
import {
  searchBeers,
  normalizeUntappdBeer,
  isUntappdAvailable,
} from '@/lib/untappd';

const MAX_IMAGE_BASE64_LENGTH = 2_800_000;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * POST /api/recognize
 *
 * Since we no longer have VLM (z-ai-web-dev-sdk is sandbox-only),
 * this endpoint now accepts:
 * 1. { image: base64 } — returns a message that image recognition requires a VLM provider
 * 2. { text: "beer name" } — searches Untappd by text (useful as alternative to camera)
 *
 * In the future, you can integrate Google Vision, AWS Rekognition, or similar
 * to extract text from labels and then search Untappd.
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

    // --- Text-based recognition (search Untappd) ---
    if (text && typeof text === 'string') {
      const query = text.trim().slice(0, 200);
      if (query.length < 2) {
        return NextResponse.json(
          { error: 'Введите минимум 2 символа' },
          { status: 400 }
        );
      }

      if (!(await isUntappdAvailable())) {
        // Fallback to local DB
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

        return NextResponse.json({
          matches: localMatches.map((beer, i) => ({
            ...beer,
            confidence: Math.max(30, 90 - i * 15),
          })),
          method: 'local',
        });
      }

      const items = await searchBeers(query, 5);
      const matches = items.map((item, i) => ({
        ...normalizeUntappdBeer(item),
        confidence: Math.max(30, 95 - i * 15),
      }));

      // Also search local DB and merge
      const localMatches = await db.beer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { brewery: { contains: query, mode: 'insensitive' } },
          ],
        },
        orderBy: { rating: 'desc' },
        take: 3,
      });

      const localNames = new Set(localMatches.map(b => b.name.toLowerCase()));
      for (const beer of localMatches) {
        if (!localNames.has(beer.name.toLowerCase()) || !matches.some(m => m.name.toLowerCase() === beer.name.toLowerCase())) {
          if (!matches.some(m => m.name.toLowerCase() === beer.name.toLowerCase())) {
            matches.push({
              ...beer,
              id: beer.id,
              confidence: 50,
              _source: 'local',
            });
          }
        }
      }

      return NextResponse.json({
        matches: matches.slice(0, 5),
        method: 'untappd',
      });
    }

    // --- Image-based "recognition" ---
    // VLM is not available outside sandbox. Return helpful error.
    if (image && typeof image === 'string') {
      if (image.length > MAX_IMAGE_BASE64_LENGTH) {
        return NextResponse.json({ error: 'Изображение слишком большое (макс 2 МБ)' }, { status: 400 });
      }
      if (image.length < 100) {
        return NextResponse.json({ error: 'Изображение повреждено' }, { status: 400 });
      }

      if (image.startsWith('data:')) {
        const mimeMatch = image.match(/^data:([^;]+);/);
        if (mimeMatch && !ALLOWED_IMAGE_TYPES.includes(mimeMatch[1])) {
          return NextResponse.json({ error: 'Неподдерживаемый формат (нужен JPEG/PNG/WebP/GIF)' }, { status: 400 });
        }
      }

      return NextResponse.json({
        matches: [],
        vlmResult: null,
        message: 'Распознавание по фото временно недоступно. Попробуйте текстовый поиск по названию пива.',
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