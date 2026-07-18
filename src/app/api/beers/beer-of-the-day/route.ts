import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readLimiter, getClientIp } from '@/lib/rate-limit';

// Simple deterministic hash for date string
function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    const hash = hashDate(dateStr);

    const totalBeers = await db.beer.count();
    if (totalBeers === 0) {
      return NextResponse.json({ error: "Нет данных" }, { status: 404 });
    }

    const index = hash % totalBeers;

    const beer = await db.beer.findFirst({
      skip: index,
      orderBy: { rating: "desc" },
    });

    if (!beer) {
      return NextResponse.json({ error: "Пиво не найдено" }, { status: 404 });
    }

    return NextResponse.json(beer);
  } catch (error) {
    console.error("Beer of the day error:", error);
    return NextResponse.json(
      { error: "Ошибка при загрузке пива дня" },
      { status: 500 }
    );
  }
}