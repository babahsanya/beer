import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Общий конверт для всех API-ответов.
 *   Success: { ok: true,  data: T }
 *   Error:   { ok: false, error: { message, code, details? } }
 */

export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiError(
  message: string,
  code: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { message, code, ...(details ? { details } : {}) } },
    { status },
  );
}

export const apiBadRequest = (message: string, details?: unknown) =>
  apiError(message, "BAD_REQUEST", 400, details);

export const apiUnauthorized = (message = "Authentication required") =>
  apiError(message, "UNAUTHORIZED", 401);

export const apiForbidden = (message = "Forbidden") =>
  apiError(message, "FORBIDDEN", 403);

export const apiNotFound = (message = "Not found") =>
  apiError(message, "NOT_FOUND", 404);

export const apiConflict = (message: string) =>
  apiError(message, "CONFLICT", 409);

export const apiTooManyRequests = (
  message = "Too many requests",
  retryAfter?: number,
) => {
  const headers = retryAfter ? { "Retry-After": String(retryAfter) } : undefined;
  return NextResponse.json(
    { ok: false, error: { message, code: "RATE_LIMITED" } },
    { status: 429, headers },
  );
};

export const apiInternalError = (
  message = "Internal server error",
  details?: unknown,
) => apiError(message, "INTERNAL_ERROR", 500, details);

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    image: session.user.image,
  };
}

export async function requireUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return apiUnauthorized();
  return user;
}
