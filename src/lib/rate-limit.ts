/**
 * In-memory rate limiter for API routes.
 * Uses sliding window per IP (or custom key).
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    // Remove timestamps older than 1 hour
    entry.timestamps = entry.timestamps.filter(t => now - t < 3600000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Time window in seconds (default: 60) */
  windowSeconds?: number;
  /** Max requests per window (default: 30) */
  maxRequests?: number;
  /** Custom key prefix (default: 'rl') */
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier (e.g., IP address).
 * Returns { allowed, remaining, resetAt }.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  cleanup();

  const {
    windowSeconds = 60,
    maxRequests = 30,
    prefix = 'rl',
  } = config;

  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Filter out expired timestamps
  entry.timestamps = entry.timestamps.filter(t => t > windowStart);

  const currentCount = entry.timestamps.length;

  if (currentCount >= maxRequests) {
    // Find when the oldest timestamp in window will expire
    const oldestInWindow = entry.timestamps[0];
    const resetAt = oldestInWindow + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Add current request
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetAt: now + windowMs,
  };
}

/**
 * Extract client IP from NextRequest.
 * Handles proxy headers (X-Forwarded-For, X-Real-IP).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

// --- Pre-configured limiters ---

/** Search endpoint: 20 requests per minute */
export const searchLimiter = (ip: string) =>
  checkRateLimit(ip, { windowSeconds: 60, maxRequests: 20, prefix: 'search' });

/** LLM/AI endpoints: 10 requests per minute */
export const aiLimiter = (ip: string) =>
  checkRateLimit(ip, { windowSeconds: 60, maxRequests: 10, prefix: 'ai' });

/** Write endpoints (POST): 30 requests per minute */
export const writeLimiter = (ip: string) =>
  checkRateLimit(ip, { windowSeconds: 60, maxRequests: 30, prefix: 'write' });

/** General read endpoints: 60 requests per minute */
export const readLimiter = (ip: string) =>
  checkRateLimit(ip, { windowSeconds: 60, maxRequests: 60, prefix: 'read' });