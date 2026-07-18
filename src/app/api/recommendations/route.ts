import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Fetch all favorites with beer data
    const favorites = await db.favorite.findMany({
      include: { beer: true },
    });

    // No favorites: return top 5 random beers
    if (favorites.length === 0) {
      const topBeers = await db.beer.findMany({
        orderBy: { rating: 'desc' },
        take: 20,
      });

      // Shuffle and pick 5
      const shuffled = topBeers.sort(() => Math.random() - 0.5).slice(0, 5);

      const recommendations = shuffled.map((beer) => ({
        beer: {
          id: beer.id,
          name: beer.name,
          style: beer.style,
          abv: beer.abv,
          ibu: beer.ibu,
          country: beer.country,
          brewery: beer.brewery,
          description: beer.description,
          label: beer.label,
          rating: beer.rating,
          ratingCount: beer.ratingCount,
          totalCheckins: beer.totalCheckins,
          monthlyCheckins: beer.monthlyCheckins,
          dailyCheckins: beer.dailyCheckins,
          source: beer.source,
        },
        reason: 'Популярное пиво',
        score: 0,
      }));

      return NextResponse.json({ recommendations });
    }

    // Collect preferred styles and countries from favorites
    const preferredStyles = new Set<string>();
    const preferredCountries = new Set<string>();

    for (const fav of favorites) {
      if (fav.beer.style) preferredStyles.add(fav.beer.style);
      if (fav.beer.country) preferredCountries.add(fav.beer.country);
    }

    const favoriteIds = new Set(favorites.map((f) => f.beerId));

    // Find beers NOT in favorites
    const candidates = await db.beer.findMany({
      where: {
        id: { notIn: Array.from(favoriteIds) },
      },
    });

    // Score each candidate
    const scored = candidates.map((beer) => {
      let score = 0;
      const matches: string[] = [];

      // +2 for matching style
      if (preferredStyles.has(beer.style)) {
        score += 2;
        matches.push('style');
      }

      // +1 for matching country
      if (preferredCountries.has(beer.country)) {
        score += 1;
        matches.push('country');
      }

      // +1 for high rating (>= 3.8)
      if (beer.rating >= 3.8) {
        score += 1;
        matches.push('highRating');
      }

      // Determine reason (priority: style > country > high rating)
      let reason: string;
      if (matches.includes('style')) {
        reason = `Тот же стиль: ${beer.style}`;
      } else if (matches.includes('country')) {
        reason = `Из ${beer.country}, как в вашем избранном`;
      } else if (matches.includes('highRating')) {
        reason = `Высокий рейтинг: ${beer.rating.toFixed(1)}`;
      } else {
        reason = 'Рекомендуем попробовать';
      }

      return {
        beer: {
          id: beer.id,
          name: beer.name,
          style: beer.style,
          abv: beer.abv,
          ibu: beer.ibu,
          country: beer.country,
          brewery: beer.brewery,
          description: beer.description,
          label: beer.label,
          rating: beer.rating,
          ratingCount: beer.ratingCount,
          totalCheckins: beer.totalCheckins,
          monthlyCheckins: beer.monthlyCheckins,
          dailyCheckins: beer.dailyCheckins,
          source: beer.source,
        },
        reason,
        score,
      };
    });

    // Sort by score desc, then by rating desc for tie-breaking
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.beer.rating !== a.beer.rating) return b.beer.rating - a.beer.rating;
      return Math.random() - 0.5;
    });

    // Take top 8
    const recommendations = scored.slice(0, 8);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке рекомендаций' },
      { status: 500 }
    );
  }
}