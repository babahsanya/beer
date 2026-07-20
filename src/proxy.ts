import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy (раньше middleware) — выполняется на каждое ребро-приближение запроса.
 * Next.js 16 переименовал `middleware.ts` → `proxy.ts`.
 *
 * Сейчас proxy лёгкий — реальная auth-проверка происходит в route handlers
 * через getSessionUser(). Причина: многие /api/* endpoints общедоступны —
 * только user-scoped endpoints требуют auth, и эта проверка делается в handler'е.
 */

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
