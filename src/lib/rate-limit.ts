/**
 * In-memory sliding-window rate limiter (V-05 / V-20).
 *
 * Tracks attempts per key (IP or email) with automatic cleanup.
 * For production at scale, swap this for a Redis-backed limiter;
 * this is sufficient for a single-process deployment.
 */

interface Entry {
  /** Timestamps of recent attempts (ms). */
  timestamps: number[];
  /** If set, the key is locked out until this epoch (ms). */
  lockedUntil?: number;
}

const store = new Map<string, Entry>();

// Garbage-collect expired entries every 5 minutes.
const GC_INTERVAL_MS = 5 * 60 * 1000;
let lastGc = Date.now();

function gc(windowMs: number) {
  const now = Date.now();
  if (now - lastGc < GC_INTERVAL_MS) return;
  lastGc = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (
      entry.timestamps.length === 0 &&
      (!entry.lockedUntil || entry.lockedUntil <= now)
    ) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the key is unlocked (only set when locked out). */
  retryAfterSeconds?: number;
}

/**
 * Check and record an attempt.
 *
 * @param key        Unique identifier (e.g. IP address or email).
 * @param maxAttempts  Max attempts allowed in the window before lockout.
 * @param windowMs     Sliding window size in milliseconds (default 15 min).
 * @param lockoutMs    How long to lock out after exceeding maxAttempts (default 15 min).
 */
export function rateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000,
  lockoutMs: number = 15 * 60 * 1000,
): RateLimitResult {
  gc(windowMs);

  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Currently locked out?
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  // Clear expired lockout.
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    entry.lockedUntil = undefined;
    entry.timestamps = [];
  }

  // Prune old timestamps outside the window.
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  // Record this attempt.
  entry.timestamps.push(now);

  // Over the limit?
  if (entry.timestamps.length > maxAttempts) {
    entry.lockedUntil = now + lockoutMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(lockoutMs / 1000),
    };
  }

  return { allowed: true };
}
