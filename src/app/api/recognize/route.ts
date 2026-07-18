import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiLimiter, getClientIp } from '@/lib/rate-limit';

const MAX_IMAGE_BASE64_LENGTH = 2_800_000;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Укажите изображение в формате base64' }, { status: 400 });
    }
    if (image.length > MAX_IMAGE_BASE64_LENGTH) {
      return NextResponse.json({ error: 'Изображение слишком большое (макс 2 МБ)' }, { status: 400 });
    }
    if (image.length < 100) {
      return NextResponse.json({ error: 'Изображение повреждено' }, { status: 400 });
    }

    let dataUrl = image;
    if (image.startsWith('data:')) {
      const mimeMatch = image.match(/^data:([^;]+);/);
      if (mimeMatch && !ALLOWED_IMAGE_TYPES.includes(mimeMatch[1])) {
        return NextResponse.json({ error: 'Неподдерживаемый формат (нужен JPEG/PNG/WebP/GIF)' }, { status: 400 });
      }
      dataUrl = image;
    } else {
      dataUrl = `data:image/jpeg;base64,${image}`;
    }

    // Try VLM recognition (requires z-ai-web-dev-sdk — available in sandbox only)
    let parsed: { name: string | null; brewery: string | null; style: string | null; confidence: number } | null = null;

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();

      const response = await zai.chat.completions.createVision({
        model: 'default',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify this beer label. Return JSON: {name, brewery, style, confidence (0-100)}. If unsure, return null values.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      });

      const vlmText = response?.choices?.[0]?.message?.content || '';
      const jsonMatch = vlmText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const raw = JSON.parse(jsonMatch[0]);
        parsed = {
          name: typeof raw.name === 'string' ? raw.name.slice(0, 200) : null,
          brewery: typeof raw.brewery === 'string' ? raw.brewery.slice(0, 200) : null,
          style: typeof raw.style === 'string' ? raw.style.slice(0, 100) : null,
          confidence: typeof raw.confidence === 'number' ? Math.min(Math.max(raw.confidence, 0), 100) : 0,
        };
      }
    } catch {
      // VLM unavailable — continue without recognition
      console.log('[recognize] VLM unavailable, searching by style keywords');
    }

    // Search for matching beers in the database
    if (parsed && parsed.name) {
      const whereConditions: Record<string, unknown>[] = [
        { name: { contains: parsed.name.slice(0, 100) } },
      ];
      if (parsed.brewery && parsed.brewery.trim().length > 0) {
        whereConditions.push({ brewery: { contains: parsed.brewery.slice(0, 100) } });
      }
      if (parsed.style && parsed.style.trim().length > 0) {
        whereConditions.push({ style: { contains: parsed.style.slice(0, 50) } });
      }

      const matchingBeers = await db.beer.findMany({
        where: { OR: whereConditions },
        orderBy: { rating: 'desc' },
        take: 3,
      });

      if (matchingBeers.length > 0) {
        const results = matchingBeers.map((beer, index) => ({
          ...beer,
          confidence: Math.max(10, parsed!.confidence - index * 15),
        }));
        return NextResponse.json({ matches: results, vlmResult: parsed });
      }
    }

    // No VLM match — return empty (no fake fallback)
    return NextResponse.json({ matches: [], vlmResult: parsed });
  } catch (error) {
    console.error('Recognize error:', error);
    return NextResponse.json({ error: 'Ошибка при распознавании' }, { status: 500 });
  }
}