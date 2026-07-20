/**
 * Клиентский API helper для использования в React-компонентах.
 * Все API endpoints теперь возвращают standardized envelope:
 *   Success: { ok: true,  data: T }
 *   Error:   { ok: false, error: { message, code, details? } }
 */

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { message: string; code: string; details?: unknown };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
  });

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError("INVALID_RESPONSE", `Сервер вернул некорректный ответ (${res.status})`, res.status);
  }

  if (!body.ok || body.error) {
    throw new ApiError(
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? "Неизвестная ошибка",
      res.status,
      body.error?.details,
    );
  }
  return body.data as T;
}

export function apiGet<T>(url: string, init?: RequestInit): Promise<T> {
  return request<T>(url, { ...init, method: "GET" });
}

export function apiPost<T>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
  return request<T>(url, { ...init, method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiPut<T>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
  return request<T>(url, { ...init, method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined });
}

export function apiDelete<T>(url: string, init?: RequestInit): Promise<T> {
  return request<T>(url, { ...init, method: "DELETE" });
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

export function getErrorMessage(error: unknown, fallback = "Что-то пошло не так"): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
