import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Корень API — редирект на healthcheck.
 */
export async function GET() {
  return NextResponse.redirect(
    new URL("/api/health", env.AUTH_URL || "http://localhost:3000"),
    307,
  );
}
