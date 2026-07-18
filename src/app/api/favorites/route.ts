import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { readLimiter, writeLimiter, getClientIp } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const favorites = await db.favorite.findMany({
      include: {
        beer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке избранного' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Укажите корректный beerId' },
        { status: 400 }
      );
    }
    const { beerId } = body;

    if (!beerId || typeof beerId !== 'string' || beerId.length > 100) {
      return NextResponse.json(
        { error: 'Укажите корректный beerId' },
        { status: 400 }
      );
    }

    // Check beer exists
    const beer = await db.beer.findUnique({ where: { id: beerId } });
    if (!beer) {
      return NextResponse.json(
        { error: 'Пиво не найдено' },
        { status: 404 }
      );
    }

    // Check if already favorited
    const existing = await db.favorite.findFirst({
      where: { beerId },
    });

    if (existing) {
      return NextResponse.json({ success: true, message: 'Уже в избранном', id: existing.id });
    }

    const favorite = await db.favorite.create({
      data: { beerId },
      include: { beer: true },
    });

    return NextResponse.json({ success: true, id: favorite.id });
  } catch (error) {
    console.error('Add favorite error:', error);
    return NextResponse.json(
      { error: 'Ошибка при добавлении в избранное' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const beerId = searchParams.get('beerId');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      await db.favorite.deleteMany();
      return NextResponse.json({ success: true, message: 'Всё избранное удалено' });
    }

    if (!beerId || beerId.length > 100) {
      return NextResponse.json(
        { error: 'Укажите beerId или all=true' },
        { status: 400 }
      );
    }

    const deleted = await db.favorite.deleteMany({
      where: { beerId },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Пиво не найдено в избранном' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Удалено из избранного' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    return NextResponse.json(
      { error: 'Ошибка при удалении из избранного' },
      { status: 500 }
    );
  }
}