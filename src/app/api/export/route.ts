import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, getClientIp } from '@/lib/rate-limit';
import { apiTooManyRequests, apiInternalError, requireUser } from '@/lib/api';

/**
 * GET /api/export
 *
 * Authenticated users only. Returns their personal data (favorites, journal,
 * view history, search history, achievements) as a JSON backup file.
 *
 * Capped at take:1000 per table to keep response sizes bounded.
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests();
    }

    const userOrRes = await requireUser();
    if (userOrRes instanceof NextResponse) return userOrRes;
    const user = userOrRes;

    const [favorites, tastingJournal, viewHistory, searchHistory, achievements] =
      await Promise.all([
        db.favorite.findMany({
          where: { userId: user.id },
          include: { beer: true },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
        db.tastingEntry.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
        db.viewHistory.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
        db.searchHistory.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
        db.userAchievement.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 1000,
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
        // Flag any table that hit the take:1000 cap — the user's full dataset
        // did not fit in this export and should be re-exported with filtering
        // or the cap should be raised.
        truncated:
          favorites.length >= 1000 ||
          tastingJournal.length >= 1000 ||
          viewHistory.length >= 1000 ||
          searchHistory.length >= 1000 ||
          achievements.length >= 1000,
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
        // Backup contains personal data — never cache on disk or in proxies.
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return apiInternalError('Ошибка при экспорте данных');
  }
}
