import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'только что';
  if (diffMinutes < 60) return `${diffMinutes} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export async function GET() {
  try {
    const history = await db.searchHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const formatted = history.map((entry) => ({
      ...entry,
      timeAgo: formatTimeAgo(entry.createdAt),
    }));

    return NextResponse.json({ history: formatted });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке истории' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await db.searchHistory.deleteMany();
    return NextResponse.json({ success: true, message: 'История очищена' });
  } catch (error) {
    console.error('History clear error:', error);
    return NextResponse.json(
      { error: 'Ошибка при очистке истории' },
      { status: 500 }
    );
  }
}