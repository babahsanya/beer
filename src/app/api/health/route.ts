import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Healthcheck endpoint.
 *
 * Используется оркестратором (Docker / Caddy / k8s) для liveness/readiness.
 * Не кешируется.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const start = Date.now();
  let dbStatus: "ok" | "down" = "ok";
  let dbLatencyMs = 0;

  try {
    const t0 = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch {
    dbStatus = "down";
  }

  const status = dbStatus === "ok" ? "ok" : "down";
  const httpStatus = status === "ok" ? 200 : 503;

  return NextResponse.json(
    {
      status,
      db: dbStatus,
      dbLatencyMs,
      uptimeMs: process.uptime() * 1000,
      responseMs: Date.now() - start,
      ts: Date.now(),
    },
    {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}
