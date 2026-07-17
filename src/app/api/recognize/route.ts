import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

interface VLMResult {
  name: string | null;
  brewery: string | null;
  style: string | null;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Укажите изображение в формате base64' },
        { status: 400 }
      );
    }

    // Use VLM to identify the beer label
    const zai = await ZAI.create();

    const imageUrl = image.startsWith('data:')
      ? image
      : `data:image/jpeg;base64,${image}`;

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
              image_url: { url: imageUrl },
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
          name: raw.name || null,
          brewery: raw.brewery || null,
          style: raw.style || null,
          confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
        };
      }
    } catch {
      // If JSON parsing fails, try to extract name from text
      parsed = {
        name: null,
        brewery: null,
        style: null,
        confidence: 0,
      };
    }

    // Search for matching beers in the database
    if (parsed && parsed.name) {
      const searchTerm = parsed.name.toLowerCase();
      const matchingBeers = await db.beer.findMany({
        where: {
          OR: [
            { name: { contains: parsed.name } },
            { brewery: { contains: parsed.brewery || '' } },
            { style: { contains: parsed.style || '' } },
          ],
        },
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

    // No matches found, return top-rated beers as fallback
    const topBeers = await db.beer.findMany({
      orderBy: { rating: 'desc' },
      take: 3,
    });

    const fallbackResults = topBeers.map((beer) => ({
      ...beer,
      confidence: parsed?.confidence ? Math.max(5, parsed.confidence - 50) : 5,
    }));

    return NextResponse.json({
      matches: fallbackResults,
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