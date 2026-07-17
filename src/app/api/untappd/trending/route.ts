import { NextRequest, NextResponse } from 'next/server';
import { getUntappdTrending } from '@/lib/untappd';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);

    // --- Attempt 1: Untappd API ---
    const untappdResult = await getUntappdTrending(limit);

    if (untappdResult && untappdResult.beers.length > 0) {
      return NextResponse.json({
        trending: untappdResult.beers.map((beer, index) => ({
          ...beer,
          rank: index + 1,
        })),
        source: 'untappd',
      });
    }

    // --- Attempt 2: Local trending data ---
    const category = searchParams.get('category') || 'global';
    const validCategories = ['craft', 'macro', 'global', 'weekly'];

    const trending = await db.trendingBeer.findMany({
      where: validCategories.includes(category) ? { category } : undefined,
      include: { beer: true },
      orderBy: { rank: 'asc' },
      take: limit,
    });

    const result = trending.map((entry) => ({
      ...entry.beer,
      checkinDelta: entry.checkinDelta,
      rank: entry.rank,
    }));

    return NextResponse.json({
      trending: result,
      source: 'local',
    });
  } catch (error) {
    console.error('Untappd trending route error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке трендов' },
      { status: 500 }
    );
  }
}