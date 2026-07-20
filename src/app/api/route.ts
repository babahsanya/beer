import { NextResponse } from "next/server";

/**
 * Корень API — редирект на healthcheck.
 */
export async function GET() {
  return NextResponse.redirect(
    new URL("/api/health", process.env.NEXTAUTH_URL || "http://localhost:3000"),
    307,
  );
}
