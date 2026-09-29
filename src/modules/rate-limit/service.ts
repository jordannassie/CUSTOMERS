import { createHash } from "node:crypto";

/** Counts hits for a key in a fixed window and returns the count including this hit. */
export type RateLimitStore = {
  hit(key: string, windowMs: number, now: number): Promise<number>;
};

export type Limit = { max: number; windowMs: number };

const HOUR = 60 * 60 * 1000;

// Per client IP, for endpoints anyone can call without logging in (SEC-07).
export const LIMITS = {
  compare: { max: 6, windowMs: HOUR },
  contact: { max: 5, windowMs: HOUR },
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

// Keys hold a hash, never the raw IP.
export function rateLimitKey(bucket: Bucket, ip: string): string {
  return `${bucket}:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

export function createLimiter(store: RateLimitStore) {
  return async function allowRequest(bucket: Bucket, ip: string, now = Date.now()): Promise<boolean> {
    const { max, windowMs } = LIMITS[bucket];
    try {
      return (await store.hit(rateLimitKey(bucket, ip), windowMs, now)) <= max;
    } catch (error) {
      // Fail open: a database hiccup should not block the contact form or the compare check.
      console.error(`[rate-limit] ${bucket} store failed, allowing the request`, error);
      return true;
    }
  };
}

/** Netlify sets x-nf-client-connection-ip itself; x-forwarded-for can carry values the client made up. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
