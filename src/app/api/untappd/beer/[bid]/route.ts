import { NextRequest, NextResponse } from 'next/server';
import { getUntappdBeerInfo } from '@/lib/untappd';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bid: string }> }
) {
  try {
    const { bid: bidStr } = await params;
    const bid = parseInt(bidStr, 10);

    if (isNaN(bid) || bid <= 0) {
      return NextResponse.json(
        { error: 'Некорректный BID пива' },
        { status: 400 }
      );
    }

    // --- Attempt 1: Untappd API ---
    const untappdResult = await getUntappdBeerInfo(bid);

    if (untappdResult && untappdResult.beer) {
      return NextResponse.json({
        beer: untappdResult.beer,
        source: 'untappd',
      });
    }

    // --- Attempt 2: Local database by untappdBid ---
    const localBeer = await db.beer.findFirst({
      where: { untappdBid: bid },
      include: {
        _count: {
          select: { reviews: true, favorites: true },
        },
      },
    });

    if (localBeer) {
      return NextResponse.json({
        beer: localBeer,
        source: 'local',
      });
    }

    // --- Not found ---
    return NextResponse.json(
      { error: 'Пиво не найдено' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Untappd beer info route error:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении информации о пиве' },
      { status: 500 }
    );
  }
}