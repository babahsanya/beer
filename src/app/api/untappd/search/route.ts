import { NextRequest, NextResponse } from 'next/server';
import { searchUntappdBeers } from '@/lib/untappd';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    if (!q.trim()) {
      return NextResponse.json({
        beers: [],
        source: 'web',
        pagination: { total: 0, limit, offset, hasMore: false },
      });
    }

    const qTrimmed = q.trim();

    // --- Attempt 1: Untappd API ---
    const untappdResult = await searchUntappdBeers(qTrimmed, limit, offset);

    if (untappdResult && untappdResult.beers.length > 0) {
      // Cache results to local database
      try {
        for (const beer of untappdResult.beers) {
          const bid = parseInt(beer.id.replace('untappd-', ''), 10);
          // Upsert: only create if no existing untappdBid matches
          const existing = await db.beer.findFirst({
            where: { untappdBid: bid },
          });

          if (!existing) {
            await db.beer.create({
              data: {
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
                untappdBid: bid,
                totalCheckins: beer.totalCheckins,
                monthlyCheckins: beer.monthlyCheckins,
                dailyCheckins: beer.dailyCheckins,
                source: 'untappd',
              },
            });
          }
        }
      } catch (cacheError) {
        // Caching failure is non-fatal — still return the results
        console.error('Untappd cache write error:', cacheError);
      }

      return NextResponse.json({
        beers: untappdResult.beers,
        source: 'untappd',
        pagination: {
          total: untappdResult.total,
          limit,
          offset,
          hasMore: offset + untappdResult.beers.length < untappdResult.total,
        },
      });
    }

    // --- Attempt 2: Web search fallback via z-ai-web-dev-sdk ---
    try {
      const zai = await ZAI.create();
      const webResult = await zai.functions.invoke('web_search', {
        query: `untappd beer ${qTrimmed}`,
      });

      const webItems = webResult?.results || [];
      const webBeers = webItems.slice(0, limit).map(
        (item: { title?: string; url?: string; snippet?: string }, index: number) => ({
          id: `web-${index}`,
          name: item.title || qTrimmed,
          style: '',
          abv: 0,
          ibu: 0,
          country: '',
          brewery: '',
          description: item.snippet || '',
          label: '',
          rating: 0,
          ratingCount: 0,
          totalCheckins: 0,
          monthlyCheckins: 0,
          dailyCheckins: 0,
          source: 'web',
          url: item.url || '',
        })
      );

      return NextResponse.json({
        beers: webBeers,
        source: 'web',
        pagination: {
          total: webBeers.length,
          limit,
          offset: 0,
          hasMore: false,
        },
      });
    } catch (webError) {
      console.error('Web search fallback error:', webError);
    }

    // --- Attempt 3: No results at all ---
    return NextResponse.json({
      beers: [],
      source: 'web',
      pagination: { total: 0, limit, offset, hasMore: false },
    });
  } catch (error) {
    console.error('Untappd search route error:', error);
    return NextResponse.json(
      { error: 'Ошибка при поиске пива' },
      { status: 500 }
    );
  }
}