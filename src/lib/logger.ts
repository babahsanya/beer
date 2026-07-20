/**
 * Structured logger.
 *
 * Output:
 *   - In production: one JSON line per log entry, e.g.
 *     `{"level":"info","msg":"Started server","ctx":{"port":3000},"t":"..."}`
 *   - In development: colorized single-line output.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("Started server", { port: 3000 });
 *   logger.error("DB connection failed", { error: String(err) });
 *
 * For request-scoped logging use `withLogger(ctx)`:
 *   const log = withLogger({ requestId, route: "/api/quiz" });
 *   log.info("Computed question");
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Min level: warn in production, debug in development.
const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" ? "warn" : "debug";

// ANSI color codes for development output.
const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m", // gray
  info: "\x1b[36m",  // cyan
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};
const RESET_COLOR = "\x1b[0m";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatContext(ctx: LogContext | undefined): string {
  if (!ctx || Object.keys(ctx).length === 0) return "";
  try {
    return JSON.stringify(ctx);
  } catch {
    return "[unserializable context]";
  }
}

function emit(level: LogLevel, msg: string, ctx: LogContext | undefined): void {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === "production") {
    // JSON line — easy to ingest with Loki / Datadog / etc.
    const payload = JSON.stringify({
      level,
      msg,
      ...(ctx && Object.keys(ctx).length > 0 ? { ctx } : {}),
      t: timestamp,
    });
    // Use the matching console method so stack traces attach for error.
    if (level === "error") console.error(payload);
    else if (level === "warn") console.warn(payload);
    else if (level === "info") console.info(payload);
    else console.debug(payload);
    return;
  }

  // Development: colorized single-line output.
  const ctxStr = formatContext(ctx);
  const line = `${COLORS[level]}[${level.toUpperCase()}]${RESET_COLOR} ${timestamp} ${msg}${ctxStr ? ` ${ctxStr}` : ""}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "info") console.info(line);
  else console.debug(line);
}

export interface Logger {
  debug: (msg: string, ctx?: LogContext) => void;
  info: (msg: string, ctx?: LogContext) => void;
  warn: (msg: string, ctx?: LogContext) => void;
  error: (msg: string, ctx?: LogContext) => void;
  /** Child logger that prepends its ctx to every log line. */
  child: (ctx: LogContext) => Logger;
}

function makeLogger(parentCtx?: LogContext): Logger {
  const merged = (extra?: LogContext): LogContext | undefined => {
    if (!parentCtx && !extra) return undefined;
    if (!parentCtx) return extra;
    if (!extra) return parentCtx;
    return { ...parentCtx, ...extra };
  };
  return {
    debug: (msg, ctx) => emit("debug", msg, merged(ctx)),
    info: (msg, ctx) => emit("info", msg, merged(ctx)),
    warn: (msg, ctx) => emit("warn", msg, merged(ctx)),
    error: (msg, ctx) => emit("error", msg, merged(ctx)),
    child: (ctx) => makeLogger(merged(ctx)),
  };
}

/** Root logger. Use directly or call `.child(ctx)` for request-scoped logs. */
export const logger: Logger = makeLogger();

/** Create a child logger with a pre-set context. Shorthand for `logger.child(ctx)`. */
export function withLogger(ctx: LogContext): Logger {
  return logger.child(ctx);
}

/**
 * Generate a short request ID for log correlation. Not cryptographically
 * strong — just enough entropy to correlate log lines across a single
 * request lifecycle.
 */
export function generateRequestId(): string {
  // 12 hex chars = 48 bits of entropy, sufficient for correlation.
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  ).slice(0, 12);
}
