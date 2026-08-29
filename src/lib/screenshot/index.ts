/**
 * Server-only screenshot utility.
 * Never import this module from client components.
 *
 * Provider is selected by the SCREENSHOT_PROVIDER env var (default: screenshotone).
 * Secrets are read only here — they are never forwarded to the browser.
 */

// ─── In-process cache ────────────────────────────────────────────────────────
// Keeps images warm within the same serverless-function instance.
// Cross-instance caching is handled by CDN cache-control headers on the route.

const CACHE_TTL_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days
const FAIL_SUPPRESS_MS = 2 * 60 * 60 * 1000;      // suppress repeat failures for 2 h

interface CacheEntry {
  data: Uint8Array | null; // null = known failure, skip provider retry
  contentType: string;
  ts: number;
}

const cache = new Map<string, CacheEntry>();

function getCache(domain: string): CacheEntry | undefined {
  const e = cache.get(domain);
  if (!e) return undefined;
  const ttl = e.data ? CACHE_TTL_MS : FAIL_SUPPRESS_MS;
  if (Date.now() - e.ts > ttl) { cache.delete(domain); return undefined; }
  return e;
}

function setCache(domain: string, data: Uint8Array | null, contentType = "image/jpeg"): void {
  cache.set(domain, { data, contentType, ts: Date.now() });
}

// ─── SSRF guard ───────────────────────────────────────────────────────────────

/** Strip protocol, www, path, query, fragment, and port — return bare hostname. */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .split(":")[0]; // strip port
}

type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validateDomain(domain: string): ValidationResult {
  if (!domain) return { ok: false, reason: "Empty domain" };

  // Basic hostname shape: at least one dot, valid chars, valid TLD length
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(domain))
    return { ok: false, reason: "Invalid domain format" };

  const h = domain.toLowerCase();

  // Loopback / localhost
  if (/^(localhost|127\.|::1)/.test(h))
    return { ok: false, reason: "Loopback address not allowed" };

  // Private ranges: 10.x, 192.168.x, 172.16-31.x
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(h))
    return { ok: false, reason: "Private IP range" };

  // Link-local
  if (/^169\.254\./i.test(h))
    return { ok: false, reason: "Link-local address" };

  // Cloud metadata / reserved
  if (h === "metadata.google.internal" || h === "169.254.169.254" || h === "0.0.0.0")
    return { ok: false, reason: "Reserved address" };

  return { ok: true };
}

// ─── Providers ────────────────────────────────────────────────────────────────

type ProviderResult = { data: Uint8Array; contentType: string } | null;

/** ScreenshotOne — https://screenshotone.com */
async function screenshotOne(domain: string): Promise<ProviderResult> {
  const apiKey = process.env.SCREENSHOTONE_API_KEY;
  if (!apiKey) return null;

  const url = new URL("https://api.screenshotone.com/take");
  url.searchParams.set("access_key",         apiKey);
  url.searchParams.set("url",                `https://${domain}`);
  url.searchParams.set("viewport_width",     "1440");
  url.searchParams.set("viewport_height",    "810");
  url.searchParams.set("format",             "jpg");
  url.searchParams.set("image_quality",      "80");
  url.searchParams.set("full_page",          "false");
  url.searchParams.set("block_ads",          "true");
  url.searchParams.set("hide_cookie_banners","true");
  url.searchParams.set("timeout",            "30");

  let res: Response;
  try {
    res = await fetch(url.toString(), { signal: AbortSignal.timeout(35_000) });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const data = new Uint8Array(await res.arrayBuffer());
  if (data.byteLength < 512) return null; // reject suspiciously small responses
  return { data, contentType };
}

// Additional providers can be added here following the same pattern.
// Switch via SCREENSHOT_PROVIDER env var.

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchScreenshot(domain: string): Promise<ProviderResult> {
  // Return from in-process cache first
  const cached = getCache(domain);
  if (cached !== undefined) {
    return cached.data ? { data: cached.data, contentType: cached.contentType } : null;
  }

  const provider = (process.env.SCREENSHOT_PROVIDER ?? "screenshotone").toLowerCase();

  let result: ProviderResult = null;
  try {
    if (provider === "screenshotone") {
      result = await screenshotOne(domain);
    }
    // else if (provider === "urlbox") { result = await urlbox(domain); }
  } catch {
    setCache(domain, null);
    return null;
  }

  setCache(domain, result?.data ?? null, result?.contentType);
  return result;
}
