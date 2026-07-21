import fs from "node:fs";
import path from "node:path";

/**
 * Structured logger — writes to BOTH stdout/stderr AND log files.
 *
 * Log files location: <project-root>/logs/
 *   - beerid.log      — all levels (info, warn, error)
 *   - beerid-error.log — only errors (for quick scanning)
 *
 * Files are appended to (not overwritten) so history is preserved across
 * restarts. In production you'd want rotation (logrotate / winston-daily-rotate),
 * but for dev this is fine.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  ts: string;
  ctx?: LogContext;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === "production" && process.env.LOG_FORMAT !== "human"
    ? "warn"
    : "debug";

const shouldLog = (level: LogLevel): boolean =>
  LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];

// ─── Log file setup ────────────────────────────────────────────────────
// Determine where to write logs:
//   1. LOG_DIR env variable (explicit override — used by start scripts)
//   2. <project-root>/logs/ (in dev — cwd is project root)
//   3. .next/standalone/logs/ (in standalone prod — cwd is standalone dir)
//   4. ./logs/ (last resort)
function findLogsDir(): string {
  // 1. Explicit env var
  if (process.env.LOG_DIR) {
    return process.env.LOG_DIR;
  }
  // 2. Try to find project root (where package.json with "name": "beerid" is)
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "beerid") {
          return path.join(dir, "logs");
        }
      } catch {
        // Invalid package.json — keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // 3. Fallback to cwd/logs
  return path.join(process.cwd(), "logs");
}

const LOGS_DIR = findLogsDir();
const ALL_LOG_FILE = path.join(LOGS_DIR, "beerid.log");
const ERROR_LOG_FILE = path.join(LOGS_DIR, "beerid-error.log");

let logsDirEnsured = false;
function ensureLogsDir() {
  if (logsDirEnsured) return;
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    logsDirEnsured = true;
  } catch {
    // If we can't create logs/ dir, just skip file logging — terminal still works
  }
}

function appendToFile(filePath: string, line: string) {
  try {
    ensureLogsDir();
    fs.appendFileSync(filePath, line + "\n", { encoding: "utf-8" });
  } catch {
    // Ignore — logging should never crash the app
  }
}

// ─── Formatting ────────────────────────────────────────────────────────

function formatTerminal(level: LogLevel, message: string, ctx?: LogContext): string {
  const colors: Record<LogLevel, string> = {
    debug: "\x1b[90m",  // gray
    info: "\x1b[36m",   // cyan
    warn: "\x1b[33m",   // yellow
    error: "\x1b[31m",  // red
  };
  const reset = "\x1b[0m";
  const ts = new Date().toISOString();
  const prefix = `${colors[level]}[${level.toUpperCase()}]${reset} ${ts}`;
  const ctxStr = ctx && Object.keys(ctx).length > 0
    ? ` ${JSON.stringify(ctx)}`
    : "";
  return `${prefix} ${message}${ctxStr}`;
}

function formatFile(level: LogLevel, message: string, ctx?: LogContext): string {
  const ts = new Date().toISOString();
  const ctxStr = ctx && Object.keys(ctx).length > 0
    ? ` ${JSON.stringify(ctx)}`
    : "";
  return `${ts} [${level.toUpperCase()}] ${message}${ctxStr}`;
}

function formatJson(level: LogLevel, message: string, ctx?: LogContext): string {
  const entry: LogEntry = {
    level,
    message,
    ts: new Date().toISOString(),
    ...(ctx && Object.keys(ctx).length > 0 ? { ctx } : {}),
  };
  return JSON.stringify(entry);
}

// ─── Core log function ────────────────────────────────────────────────

function log(level: LogLevel, message: string, ctx?: LogContext): void {
  if (!shouldLog(level)) return;

  const isProd =
    process.env.NODE_ENV === "production" && process.env.LOG_FORMAT !== "human";

  // 1. Terminal output
  const terminalLine = isProd
    ? formatJson(level, message, ctx)
    : formatTerminal(level, message, ctx);
  if (level === "error" || level === "warn") {
    process.stderr.write(terminalLine + "\n");
  } else {
    process.stdout.write(terminalLine + "\n");
  }

  // 2. File output
  const fileLine = isProd
    ? formatJson(level, message, ctx)
    : formatFile(level, message, ctx);
  appendToFile(ALL_LOG_FILE, fileLine);

  // 3. Error file — only errors, for quick scanning
  if (level === "error") {
    appendToFile(ERROR_LOG_FILE, fileLine);
  }
}

// ─── Public API ────────────────────────────────────────────────────────

export const logger = {
  debug: (message: string, ctx?: LogContext) => log("debug", message, ctx),
  info: (message: string, ctx?: LogContext) => log("info", message, ctx),
  warn: (message: string, ctx?: LogContext) => log("warn", message, ctx),
  error: (message: string, ctx?: LogContext) => log("error", message, ctx),
};

export function withLogger(baseCtx: LogContext) {
  return {
    debug: (message: string, ctx?: LogContext) =>
      log("debug", message, { ...baseCtx, ...ctx }),
    info: (message: string, ctx?: LogContext) =>
      log("info", message, { ...baseCtx, ...ctx }),
    warn: (message: string, ctx?: LogContext) =>
      log("warn", message, { ...baseCtx, ...ctx }),
    error: (message: string, ctx?: LogContext) =>
      log("error", message, { ...baseCtx, ...ctx }),
  };
}

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function getLogFilePaths() {
  return {
    all: ALL_LOG_FILE,
    error: ERROR_LOG_FILE,
    dir: LOGS_DIR,
  };
}
