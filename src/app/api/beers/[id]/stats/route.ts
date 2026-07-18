import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';

// Simple deterministic hash from string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

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

    const { id } = await params;

    const beer = await db.beer.findUnique({ where: { id } });
    if (!beer) {
      return NextResponse.json(
        { error: 'Пиво не найдено' },
        { status: 404 }
      );
    }

    // Generate deterministic rating breakdowns based on beer properties
    const baseRating = beer.rating;
    const seed = hashCode(beer.id + beer.name);

    // Use seed to generate consistent variations (±0.3 range)
    const variation = (index: number, range: number) => {
      const h = hashCode(beer.id + String(index));
      return (h % 1000) / 1000 * range - range / 2;
    };

    const aroma = Math.round((baseRating + variation(1, 0.6)) * 100) / 100;
    const taste = Math.round((baseRating + variation(2, 0.4)) * 100) / 100;
    const appearance = Math.round((baseRating + variation(3, 0.6)) * 100) / 100;
    const overall = Math.round((baseRating + variation(4, 0.2)) * 100) / 100;

    // Clamp to 1-5 range
    const clamp = (val: number) => Math.min(5, Math.max(1, val));

    // Deterministic rating distribution based on overall rating
    const highRatio = Math.max(0.1, Math.min(0.4, (baseRating - 3) * 0.15 + 0.15));
    const lowRatio = Math.max(0.05, Math.min(0.15, (3 - baseRating) * 0.05 + 0.05));
    const midRatio = 1 - highRatio - lowRatio;
    const mid3Ratio = midRatio * 0.5;
    const mid4Ratio = midRatio * 0.5;

    return NextResponse.json({
      totalCheckins: beer.totalCheckins,
      monthlyCheckins: beer.monthlyCheckins,
      dailyCheckins: beer.dailyCheckins,
      ratingBreakdown: {
        aroma: clamp(aroma),
        taste: clamp(taste),
        appearance: clamp(appearance),
        overall: clamp(overall),
      },
      ratingDistribution: {
        5: Math.round(beer.ratingCount * highRatio),
        4: Math.round(beer.ratingCount * mid4Ratio),
        3: Math.round(beer.ratingCount * mid3Ratio),
        2: Math.round(beer.ratingCount * lowRatio * 0.75),
        1: Math.round(beer.ratingCount * lowRatio * 0.25),
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке статистики' },
      { status: 500 }
    );
  }
}