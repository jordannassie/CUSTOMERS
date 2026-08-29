/**
 * GET /api/public/screenshot?domain=<normalized-domain>
 *
 * Server-side screenshot proxy. Fetches from the configured provider
 * and streams the image bytes back with long-lived CDN cache headers.
 * The provider API key never reaches the browser.
 *
 * Security:
 *  - SSRF-protected via validateDomain()
 *  - Rate-limited per IP
 *  - Only http/https targets; no localhost / private IPs
 *  - No client-supplied provider parameters
 */

import { NextResponse, type NextRequest } from "next/server";
import { normalizeDomain, validateDomain, fetchScreenshot } from "@/lib/screenshot";

// ─── Rate limiter (per warm instance) ────────────────────────────────────────

const rateMap = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_HOUR = 20;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const e   = rateMap.get(ip);
  if (!e || now > e.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (e.count >= MAX_PER_HOUR) return false;
  e.count++;
  return true;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return new NextResponse(null, {
      status: 429,
      headers: { "Retry-After": "3600" },
    });
  }

  const rawDomain = request.nextUrl.searchParams.get("domain") ?? "";
  const domain    = normalizeDomain(rawDomain);
  const valid     = validateDomain(domain);

  if (!valid.ok) {
    return new NextResponse(null, { status: 400 });
  }

  // Screenshot generation must never block or fail the overall compare analysis.
  // If it returns null, the client renders the fallback UI instead.
  const result = await fetchScreenshot(domain);

  if (!result) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(Buffer.from(result.data), {
    status: 200,
    headers: {
      "Content-Type":  result.contentType,
      // Cache at CDN edge for 7 days; stale-while-revalidate for 1 day
      "Cache-Control": "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      // Prevent search engines from indexing screenshot responses
      "X-Robots-Tag":  "noindex, nofollow",
    },
  });
}
