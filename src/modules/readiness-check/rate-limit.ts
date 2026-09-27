export const MAX_CHECKS_PER_HOUR = 6;
const WINDOW_MS = 60 * 60 * 1000;

// In memory, so each server instance counts separately; a shared store is MVP_ROADMAP SEC-07 (B-82).
const hits = new Map<string, { count: number; resetAt: number }>();

export function allowCheck(ip: string, now = Date.now()): boolean {
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_CHECKS_PER_HOUR) return false;
  entry.count++;
  return true;
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
