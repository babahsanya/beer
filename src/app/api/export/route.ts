import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const [favorites, tastingJournal, viewHistory, searchHistory, achievements] =
      await Promise.all([
        db.favorite.findMany({
          include: { beer: true },
          orderBy: { createdAt: 'desc' },
        }),
        db.tastingEntry.findMany({
          orderBy: { createdAt: 'desc' },
        }),
        db.viewHistory.findMany({
          orderBy: { createdAt: 'desc' },
        }),
        db.searchHistory.findMany({
          orderBy: { createdAt: 'desc' },
        }),
        db.userAchievement.findMany({
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const uniqueStyles = new Set(tastingJournal.map((t) => t.beerStyle).filter(Boolean));

    const exportData = {
      version: '1.0' as const,
      exportedAt: new Date().toISOString(),
      favorites: favorites.map((f) => ({
        id: f.id,
        beerId: f.beerId,
        beer: f.beer
          ? {
              id: f.beer.id,
              name: f.beer.name,
              style: f.beer.style,
              abv: f.beer.abv,
              ibu: f.beer.ibu,
              country: f.beer.country,
              brewery: f.beer.brewery,
              description: f.beer.description,
              label: f.beer.label,
              rating: f.beer.rating,
              ratingCount: f.beer.ratingCount,
            }
          : null,
        createdAt: f.createdAt.toISOString(),
      })),
      tastingJournal: tastingJournal.map((t) => ({
        id: t.id,
        beerId: t.beerId,
        beerName: t.beerName,
        beerStyle: t.beerStyle,
        brewery: t.brewery,
        abv: t.abv,
        country: t.country,
        personalRating: t.personalRating,
        aroma: t.aroma,
        taste: t.taste,
        appearance: t.appearance,
        mouthfeel: t.mouthfeel,
        comment: t.comment,
        location: t.location,
        glassType: t.glassType,
        wouldBuyAgain: t.wouldBuyAgain,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      viewHistory: viewHistory.map((v) => ({
        id: v.id,
        beerId: v.beerId,
        beerName: v.beerName,
        createdAt: v.createdAt.toISOString(),
      })),
      searchHistory: searchHistory.map((s) => ({
        id: s.id,
        query: s.query,
        resultCount: s.resultCount,
        createdAt: s.createdAt.toISOString(),
      })),
      achievements: achievements.map((a) => ({
        id: a.id,
        key: a.key,
        title: a.title,
        description: a.description,
        icon: a.icon,
        progress: a.progress,
        target: a.target,
        unlockedAt: a.unlockedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      stats: {
        totalFavorites: favorites.length,
        totalTastings: tastingJournal.length,
        totalStylesExplored: uniqueStyles.size,
      },
    };

    const json = JSON.stringify(exportData, null, 2);
    const bytes = new TextEncoder().encode(json).length;
    const sizeKB = (bytes / 1024).toFixed(1);

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="beerid-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        'Content-Length': bytes.toString(),
        'X-File-Size-KB': sizeKB,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Ошибка при экспорте данных' },
      { status: 500 }
    );
  }
}