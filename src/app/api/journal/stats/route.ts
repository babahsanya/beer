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

    const allEntries = await db.tastingEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const totalEntries = allEntries.length;

    // Average personal rating
    const ratedEntries = allEntries.filter((e) => e.personalRating > 0);
    const avgRating =
      ratedEntries.length > 0
        ? ratedEntries.reduce((sum, e) => sum + e.personalRating, 0) /
          ratedEntries.length
        : 0;

    // Most tasted style
    const styleCounts: Record<string, number> = {};
    allEntries.forEach((e) => {
      if (e.beerStyle) {
        styleCounts[e.beerStyle] = (styleCounts[e.beerStyle] || 0) + 1;
      }
    });
    const mostTastedStyle = Object.entries(styleCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || '—';

    // Rating distribution (1-5)
    const ratingDistribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    allEntries.forEach((e) => {
      if (e.personalRating >= 1 && e.personalRating <= 5) {
        ratingDistribution[String(e.personalRating)]++;
      }
    });

    // Tastings per month (last 6 months)
    const now = new Date();
    const tastingsPerMonth: { month: string; count: number }[] = [];
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const count = allEntries.filter(
        (e) => e.createdAt >= d && e.createdAt <= monthEnd
      ).length;
      tastingsPerMonth.push({
        month: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`,
        count,
      });
    }

    // Top rated beers
    const topRated = [...allEntries]
      .filter((e) => e.personalRating > 0)
      .sort((a, b) => b.personalRating - a.personalRating)
      .slice(0, 5)
      .map((e) => ({
        beerName: e.beerName,
        personalRating: e.personalRating,
        beerStyle: e.beerStyle,
        brewery: e.brewery,
      }));

    // Style diversity count
    const styleDiversity = Object.keys(styleCounts).length;

    return NextResponse.json({
      totalEntries,
      avgRating: Math.round(avgRating * 100) / 100,
      mostTastedStyle,
      ratingDistribution,
      tastingsPerMonth,
      topRated,
      styleDiversity,
    });
  } catch (error) {
    console.error('Journal stats error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке статистики' },
      { status: 500 }
    );
  }
}