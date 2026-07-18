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

    const history = await db.viewHistory.findMany({
      include: { beer: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return NextResponse.json(history);
  } catch (error) {
    console.error('Recent view error:', error);
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    await db.viewHistory.deleteMany();
    return NextResponse.json({ success: true, message: 'Недавно просмотренные очищены' });
  } catch (error) {
    console.error('Recent clear error:', error);
    return NextResponse.json(
      { error: 'Ошибка при очистке' },
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

    const { beerId, beerName } = await request.json();

    // Validate beerId
    if (!beerId || typeof beerId !== 'string' || beerId.length > 100) {
      return NextResponse.json({ error: 'beerId required' }, { status: 400 });
    }

    // SECURITY: Sanitize beerName to prevent stored XSS
    const safeBeerName = typeof beerName === 'string'
      ? beerName.replace(/[<>"'&]/g, '').slice(0, 200)
      : '';

    await db.viewHistory.deleteMany({ where: { beerId } });
    await db.viewHistory.create({
      data: { beerId, beerName: safeBeerName },
    });

    const count = await db.viewHistory.count();
    if (count > 20) {
      const toDelete = await db.viewHistory.findMany({
        orderBy: { createdAt: 'asc' },
        take: count - 20,
        select: { id: true },
      });
      if (toDelete.length > 0) {
        await db.viewHistory.deleteMany({
          where: { id: { in: toDelete.map(d => d.id) } },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recent view create error:', error);
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}