import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';

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

    const currentBeer = await db.beer.findUnique({ where: { id } });
    if (!currentBeer) {
      return NextResponse.json(
        { error: 'Пиво не найдено' },
        { status: 404 }
      );
    }

    // Step 1: Try exact style match with relaxed ABV ±3%
    const abvMin = Math.max(0, currentBeer.abv - 3);
    const abvMax = currentBeer.abv + 3;

    let candidates = await db.beer.findMany({
      where: {
        id: { not: id },
        style: currentBeer.style,
        abv: { gte: abvMin, lte: abvMax },
      },
      orderBy: { rating: 'desc' },
      take: 15,
    });

    // Step 2: If not enough, broaden to partial style match (same style family)
    if (candidates.length < 3) {
      const styleKeywords = extractStyleKeywords(currentBeer.style);
      if (styleKeywords.length > 0) {
        const broadCandidates = await db.beer.findMany({
          where: {
            id: { not: id },
            abv: { gte: Math.max(0, currentBeer.abv - 4), lte: currentBeer.abv + 4 },
          },
          orderBy: { rating: 'desc' },
          take: 30,
        });

        const existingIds = new Set(candidates.map(b => b.id));
        for (const beer of broadCandidates) {
          if (existingIds.has(beer.id)) continue;
          const beerKeywords = extractStyleKeywords(beer.style);
          const overlap = styleKeywords.filter(k => beerKeywords.includes(k)).length;
          if (overlap > 0) {
            candidates.push({ ...beer, _styleOverlap: overlap });
          }
          if (candidates.length >= 15) break;
        }
      }
    }

    // Step 3: If STILL not enough, just get similar ABV range beers
    if (candidates.length < 3) {
      const fallbackCandidates = await db.beer.findMany({
        where: {
          id: { not: id, notIn: candidates.map(b => b.id) },
          abv: { gte: Math.max(0, currentBeer.abv - 2), lte: currentBeer.abv + 2 },
        },
        orderBy: { rating: 'desc' },
        take: 10,
      });
      candidates = [...candidates, ...fallbackCandidates];
    }

    // Calculate similarity score
    const maxAbvDelta = 4;
    const similar = candidates
      .map((beer) => {
        const abvDelta = Math.abs(beer.abv - currentBeer.abv);
        const abvScore = Math.max(0, 1 - abvDelta / maxAbvDelta);

        // Style similarity
        let styleScore = 0;
        if (beer.style === currentBeer.style) {
          styleScore = 1;
        } else {
          const a = extractStyleKeywords(beer.style);
          const b = extractStyleKeywords(currentBeer.style);
          const overlap = a.filter(k => b.includes(k)).length;
          const total = new Set([...a, ...b]).size;
          styleScore = total > 0 ? overlap / total : 0;
        }

        // Country bonus
        const countryBonus = beer.country === currentBeer.country ? 0.1 : 0;
        // Brewery bonus
        const breweryBonus = beer.brewery === currentBeer.brewery ? 0.15 : 0;

        const similarity = Math.min(0.99, Math.round((styleScore * 0.5 + abvScore * 0.35 + countryBonus + breweryBonus) * 100) / 100);
        const { _styleOverlap, ...cleanBeer } = beer as Record<string, unknown> & { _styleOverlap?: number };
        return { ...cleanBeer, similarity };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return NextResponse.json({ similar });
  } catch (error) {
    console.error('Similar beers error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке похожих пив' },
      { status: 500 }
    );
  }
}

// Extract keywords from style name for fuzzy matching
function extractStyleKeywords(style: string): string[] {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'with', 'of', 'in', 'de', 'la', 'le', 'et']);
  return style
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/g, '')
    .split(/[\s-]+/)
    .filter(w => w.length > 1 && !commonWords.has(w));
}