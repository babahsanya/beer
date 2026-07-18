import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readLimiter, getClientIp } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
    }

    // 1. Style ratings: avg rating per style
    const styleRatingsRaw = await db.beer.groupBy({
      by: ["style"],
      _avg: { rating: true },
      _count: { id: true },
      orderBy: { _avg: { rating: "desc" } },
    });
    const styleRatings = styleRatingsRaw.map((s) => ({
      style: s.style,
      avgRating: Math.round((s._avg.rating ?? 0) * 100) / 100,
      count: s._count.id,
    }));

    // 2. ABV distribution
    const allBeers = await db.beer.findMany({
      select: { abv: true, ibu: true, country: true },
    });

    const abvRanges = [
      { range: "0–3%", min: 0, max: 3 },
      { range: "3–5%", min: 3, max: 5 },
      { range: "5–7%", min: 5, max: 7 },
      { range: "7–10%", min: 7, max: 10 },
      { range: "10%+", min: 10, max: Infinity },
    ];
    const abvDistribution = abvRanges.map((r) => ({
      range: r.range,
      count: allBeers.filter((b) => b.abv >= r.min && b.abv < r.max).length,
    }));

    // 3. IBU distribution
    const ibuRanges = [
      { range: "0–20", min: 0, max: 20 },
      { range: "20–40", min: 20, max: 40 },
      { range: "40–60", min: 40, max: 60 },
      { range: "60–80", min: 60, max: 80 },
      { range: "80–100", min: 80, max: 100 },
      { range: "100+", min: 100, max: Infinity },
    ];
    const ibuDistribution = ibuRanges.map((r) => ({
      range: r.range,
      count: allBeers.filter((b) => b.ibu >= r.min && b.ibu < r.max).length,
    }));

    // 4. Country distribution — top 10
    const countryMap = new Map<string, number>();
    for (const b of allBeers) {
      if (b.country) {
        countryMap.set(b.country, (countryMap.get(b.country) ?? 0) + 1);
      }
    }
    const countryDistribution = Array.from(countryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    // 5. Top 10 rated beers
    const topRatedRaw = await db.beer.findMany({
      orderBy: { rating: "desc" },
      take: 10,
      select: { name: true, rating: true, style: true, brewery: true },
    });
    const topRated = topRatedRaw.map((b) => ({
      name: b.name,
      rating: Math.round(b.rating * 100) / 100,
      style: b.style,
      brewery: b.brewery,
    }));

    // 6. Style popularity — beers per style sorted by count
    const stylePopularityRaw = await db.beer.groupBy({
      by: ["style"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    const stylePopularity = stylePopularityRaw.map((s) => ({
      style: s.style,
      count: s._count.id,
    }));

    return NextResponse.json({
      styleRatings,
      abvDistribution,
      ibuDistribution,
      countryDistribution,
      topRated,
      stylePopularity,
    });
  } catch (error) {
    console.error("Charts API error:", error);
    return NextResponse.json({ error: "Ошибка загрузки данных" }, { status: 500 });
  }
}