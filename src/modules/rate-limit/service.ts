import { createHash } from "node:crypto";

/** Counts hits for a key in a fixed window and returns the count including this hit. */
export type RateLimitStore = {
  hit(key: string, windowMs: number, now: number): Promise<number>;
};

export type Limit = { max: number; windowMs: number };

const HOUR = 60 * 60 * 1000;

// Per client IP for endpoints anyone can call without logging in, per user for signed-in ones (SEC-07).
export const LIMITS = {
  compare: { max: 6, windowMs: HOUR },
  contact: { max: 5, windowMs: HOUR },
  feature_request: { max: 10, windowMs: HOUR },
} satisfies Record<string, Limit>;

export type Bucket = keyof typeof LIMITS;

/** Start of the fixed window that `now` falls in, so every server instance agrees on it. */
export function windowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

// For unit tests; production uses the shared table in dal.ts.
export function memoryStore(): RateLimitStore {
  const windows = new Map<string, { count: number; resetAt: number }>();
  return {
    async hit(key, windowMs, now) {
      const entry = windows.get(key);
      if (!entry || now >= entry.resetAt) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
        return 1;
      }
      return ++entry.count;
    },
  };
}

// Keys hold a hash, never the raw IP or user id.
export function rateLimitKey(bucket: Bucket, ip: string): string {
  return `${bucket}:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

/** "limited": over this bucket's limit. "unavailable": the count could not be read, so the request is refused too. */
export type RateLimitResult = "allowed" | "limited" | "unavailable";

export function createLimiter(store: RateLimitStore) {
  return async function checkRateLimit(bucket: Bucket, ip: string, now = Date.now()): Promise<RateLimitResult> {
    const { max, windowMs } = LIMITS[bucket];
    try {
      return (await store.hit(rateLimitKey(bucket, ip), windowMs, now)) <= max ? "allowed" : "limited";
    } catch (error) {
      // Fail closed (SEC-07): with the store down, no limit holds, so an endless burst would get through. Callers
      // say to try again in a few minutes, not that the visitor did too much (2026-10-14).
      console.error(`[rate-limit] ${bucket} store failed, refusing the request`, error);
      return "unavailable";
    }
  };
}

/**
 * Netlify sets x-nf-client-connection-ip itself. In x-forwarded-for only the last entry is added by the proxy in
 * front of us; the ones before it are whatever the client sent, so a client could pick a new address per request.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown"
  );
}
