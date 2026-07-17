import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Module-level cache to avoid repeating beers within a session
const usedBeerIds = new Set<string>();
const MAX_CACHE_SIZE = 40;

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

export async function GET() {
  try {
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

    // Find available beers not recently used
    let availableBeers = allBeers.filter((b) => !usedBeerIds.has(b.id));

    // If all beers have been used, reset cache
    if (availableBeers.length < 4) {
      usedBeerIds.clear();
      availableBeers = allBeers;
    }

    // Pick the correct beer
    const correctIndex = Math.floor(Math.random() * availableBeers.length);
    const correctBeer = availableBeers[correctIndex];

    // Track this beer as used
    usedBeerIds.add(correctBeer.id);
    if (usedBeerIds.size > MAX_CACHE_SIZE) {
      const firstId = usedBeerIds.values().next().value;
      if (firstId) usedBeerIds.delete(firstId);
    }

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