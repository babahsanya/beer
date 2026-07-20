import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { readLimiter, writeLimiter, getClientIp } from "@/lib/rate-limit";
import {
  apiSuccess,
  apiBadRequest,
  apiNotFound,
  apiForbidden,
  apiTooManyRequests,
  apiInternalError,
  requireUser,
} from "@/lib/api";
import {
  cuidSchema,
  tastingEntryUpdateSchema,
  formatZodErrors,
} from "@/lib/validation";

/**
 * GET /api/journal/[id] — fetch one tasting entry (must be the owner).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getClientIp(request);
    const rl = readLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests(
        "Слишком много запросов",
        Math.ceil((rl.resetAt - Date.now()) / 1000),
      );
    }

    const userOrError = await requireUser();
    if (userOrError instanceof NextResponse) return userOrError;
    const user = userOrError;

    const { id: rawId } = await params;
    const idResult = cuidSchema.safeParse(rawId);
    if (!idResult.success) {
      return apiBadRequest("Некорректный ID");
    }
    const id = idResult.data;

    const entry = await db.tastingEntry.findUnique({ where: { id } });

    if (!entry) {
      return apiNotFound("Запись не найдена");
    }

    if (entry.userId !== user.id) {
      return apiForbidden();
    }

    return apiSuccess(entry);
  } catch (error) {
    logger.error("Get journal entry error", { error: String(error) });
    return apiInternalError("Ошибка при загрузке записи");
  }
}

/**
 * PUT /api/journal/[id] — update one tasting entry.
 * Verifies ownership (entry.userId === user.id) before updating; returns
 * apiForbidden() otherwise. Body validated via tastingEntryUpdateSchema.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests(
        "Слишком много запросов",
        Math.ceil((rl.resetAt - Date.now()) / 1000),
      );
    }

    const userOrError = await requireUser();
    if (userOrError instanceof NextResponse) return userOrError;
    const user = userOrError;

    const { id: rawId } = await params;
    const idResult = cuidSchema.safeParse(rawId);
    if (!idResult.success) {
      return apiBadRequest("Некорректный ID");
    }
    const id = idResult.data;

    const existing = await db.tastingEntry.findUnique({ where: { id } });

    if (!existing) {
      return apiNotFound("Запись не найдена");
    }

    if (existing.userId !== user.id) {
      return apiForbidden();
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiBadRequest("Некорректный JSON");
    }

    const parsed = tastingEntryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiBadRequest("Некорректные данные", formatZodErrors(parsed.error));
    }

    // Build partial update payload — only fields that were provided.
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }

    const entry = await db.tastingEntry.update({
      where: { id },
      data,
    });

    return apiSuccess({ entry });
  } catch (error) {
    logger.error("Update journal entry error", { error: String(error) });
    return apiInternalError("Ошибка при обновлении записи");
  }
}

/**
 * DELETE /api/journal/[id] — delete one tasting entry.
 * Verifies ownership (entry.userId === user.id) before deleting; returns
 * apiForbidden() otherwise.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getClientIp(request);
    const rl = writeLimiter(ip);
    if (!rl.allowed) {
      return apiTooManyRequests(
        "Слишком много запросов",
        Math.ceil((rl.resetAt - Date.now()) / 1000),
      );
    }

    const userOrError = await requireUser();
    if (userOrError instanceof NextResponse) return userOrError;
    const user = userOrError;

    const { id: rawId } = await params;
    const idResult = cuidSchema.safeParse(rawId);
    if (!idResult.success) {
      return apiBadRequest("Некорректный ID");
    }
    const id = idResult.data;

    const existing = await db.tastingEntry.findUnique({ where: { id } });

    if (!existing) {
      return apiNotFound("Запись не найдена");
    }

    if (existing.userId !== user.id) {
      return apiForbidden();
    }

    await db.tastingEntry.delete({ where: { id } });

    return apiSuccess({ deleted: id });
  } catch (error) {
    logger.error("Delete journal entry error", { error: String(error) });
    return apiInternalError("Ошибка при удалении записи");
  }
}
