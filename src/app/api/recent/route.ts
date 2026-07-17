import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
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

export async function DELETE() {
  try {
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
    const { beerId, beerName } = await request.json();
    if (!beerId) return NextResponse.json({ error: 'beerId required' }, { status: 400 });

    await db.viewHistory.deleteMany({ where: { beerId } });
    await db.viewHistory.create({
      data: { beerId, beerName: beerName || '' },
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