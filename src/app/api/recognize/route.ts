import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { aiLimiter, getClientIp } from '@/lib/rate-limit';

interface VLMResult {
  name: string | null;
  brewery: string | null;
  style: string | null;
  confidence: number;
}

// Maximum base64 length (~2MB in base64 ≈ 1.5MB actual)
const MAX_IMAGE_BASE64_LENGTH = 2_800_000;
// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    // Rate limit AI endpoint
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
      return NextResponse.json(
        { error: 'Укажите изображение в формате base64' },
        { status: 400 }
      );
    }

    // SECURITY: Validate image size
    if (image.length > MAX_IMAGE_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'Изображение слишком большое (максимум 2 МБ)' },
        { status: 400 }
      );
    }

    // SECURITY: Validate minimum size (not empty/trivial)
    if (image.length < 100) {
      return NextResponse.json(
        { error: 'Изображение слишком маленькое или повреждено' },
        { status: 400 }
      );
    }

    // SECURITY: Validate MIME type to prevent non-image data
    let dataUrl = image;
    if (image.startsWith('data:')) {
      const mimeMatch = image.match(/^data:([^;]+);/);
      if (mimeMatch && !ALLOWED_IMAGE_TYPES.includes(mimeMatch[1])) {
        return NextResponse.json(
          { error: 'Недопустимый формат изображения. Используйте JPEG, PNG, WebP или GIF.' },
          { status: 400 }
        );
      }
      dataUrl = image;
    } else {
      // Default to JPEG for raw base64
      dataUrl = `data:image/jpeg;base64,${image}`;
    }

    // Use VLM to identify the beer label
    const zai = await ZAI.create();

    const response = await zai.chat.completions.createVision({
      model: 'default',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Identify this beer label. Return a JSON with: name (beer name), brewery, style, and confidence (0-100). If you can\'t identify, return null.',
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    });

    // Parse VLM response
    const vlmText =
      response?.choices?.[0]?.message?.content || '';

    let parsed: VLMResult | null = null;
    try {
      // Try to extract JSON from the response
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
      // If JSON parsing fails
      parsed = {
        name: null,
        brewery: null,
        style: null,
        confidence: 0,
      };
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
          confidence: Math.max(
            10,
            parsed!.confidence - index * 15
          ),
        }));

        return NextResponse.json({
          matches: results,
          vlmResult: parsed,
        });
      }
    }

    // SECURITY FIX: No more deceptive fallback to top-rated beers.
    // If VLM can't identify anything, return empty results.
    return NextResponse.json({
      matches: [],
      vlmResult: parsed,
    });
  } catch (error) {
    console.error('Recognize error:', error);
    return NextResponse.json(
      { error: 'Ошибка при распознавании этикетки' },
      { status: 500 }
    );
  }
}