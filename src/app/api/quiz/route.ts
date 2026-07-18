import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { readLimiter, getClientIp } from '@/lib/rate-limit';

// SECURITY FIX: Removed module-level `usedBeerIds` Set.
// Quiz uniqueness is now handled per-session via a client-sent `exclude` parameter.
// This prevents state leakage between different users on the same server.

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'K';
  }
  return String(n);
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Слишком много запросов' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    // Client sends comma-separated IDs of recently seen beers to avoid repeats
    const excludeParam = searchParams.get('exclude') || '';
    const excludeIds = new Set(
      excludeParam.split(',').filter(id => id.length > 0 && id.length < 100)
    );

    const allBeers = await db.beer.findMany({
      select: {
        id: true,
        name: true,
        style: true,
        abv: true,
        ibu: true,
        country: true,
        rating: true,
        totalCheckins: true,
      },
    });

    if (allBeers.length < 4) {
      return NextResponse.json({ error: 'Недостаточно пива в базе' }, { status: 400 });
    }

    // Filter out recently seen beers
    let availableBeers = allBeers.filter((b) => !excludeIds.has(b.id));

    // If all excluded, reset to full pool
    if (availableBeers.length < 4) {
      availableBeers = allBeers;
    }

    // Pick the correct beer
    const correctIndex = Math.floor(Math.random() * availableBeers.length);
    const correctBeer = availableBeers[correctIndex];

    // Pick 3 wrong options from other beers
    const otherBeers = allBeers.filter((b) => b.id !== correctBeer.id);
    const shuffledOthers = shuffleArray(otherBeers);
    const wrongBeers = shuffledOthers.slice(0, 3);

    // Build options array and shuffle
    const options = shuffleArray([correctBeer, ...wrongBeers].map((b) => b.name));
    const correctOptionIndex = options.indexOf(correctBeer.name);

    // Generate 3 facts
    const fact1 = `Это ${correctBeer.style} из ${correctBeer.country}`;
    const fact2 = `Крепкость ${correctBeer.abv}%, горечь ${correctBeer.ibu} IBU`;
    const fact3 = `Рейтинг ${correctBeer.rating}, ${formatNumber(correctBeer.totalCheckins)} чекинов`;

    return NextResponse.json({
      id: correctBeer.id,
      fact1,
      fact2,
      fact3,
      options,
      correctIndex: correctOptionIndex,
      beerName: correctBeer.name,
    });
  } catch (error) {
    console.error('Quiz API error:', error);
    return NextResponse.json({ error: 'Не удалось загрузить вопрос' }, { status: 500 });
  }
}