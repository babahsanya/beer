import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, writeLimiter, getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const { id } = await params;
    const entry = await db.tastingEntry.findUnique({ where: { id } });

    if (!entry) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Get journal entry error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке записи' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const { id } = await params;
    const existing = await db.tastingEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      beerName,
      beerStyle,
      brewery,
      abv,
      country,
      personalRating,
      aroma,
      taste,
      appearance,
      mouthfeel,
      comment,
      location,
      glassType,
      wouldBuyAgain,
    } = body;

    const entry = await db.tastingEntry.update({
      where: { id },
      data: {
        ...(beerName !== undefined && { beerName: String(beerName).trim() }),
        ...(beerStyle !== undefined && { beerStyle: String(beerStyle).trim() }),
        ...(brewery !== undefined && { brewery: String(brewery).trim() }),
        ...(abv !== undefined && { abv: Number(abv) || 0 }),
        ...(country !== undefined && { country: String(country).trim() }),
        ...(personalRating !== undefined && {
          personalRating: Math.min(5, Math.max(0, parseInt(String(personalRating), 10) || 0)),
        }),
        ...(aroma !== undefined && {
          aroma: Math.min(5, Math.max(0, parseInt(String(aroma), 10) || 0)),
        }),
        ...(taste !== undefined && {
          taste: Math.min(5, Math.max(0, parseInt(String(taste), 10) || 0)),
        }),
        ...(appearance !== undefined && {
          appearance: Math.min(5, Math.max(0, parseInt(String(appearance), 10) || 0)),
        }),
        ...(mouthfeel !== undefined && {
          mouthfeel: Math.min(5, Math.max(0, parseInt(String(mouthfeel), 10) || 0)),
        }),
        ...(comment !== undefined && { comment: String(comment).trim() }),
        ...(location !== undefined && { location: String(location).trim() }),
        ...(glassType !== undefined && { glassType: String(glassType).trim() }),
        ...(wouldBuyAgain !== undefined && { wouldBuyAgain: Boolean(wouldBuyAgain) }),
      },
    });

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Update journal entry error:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении записи' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const { id } = await params;
    const existing = await db.tastingEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Запись не найдена' },
        { status: 404 }
      );
    }

    await db.tastingEntry.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Запись удалена' });
  } catch (error) {
    console.error('Delete journal entry error:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении записи' },
      { status: 500 }
    );
  }
}