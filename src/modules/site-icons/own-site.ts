import { safeFetch as defaultFetch, type SafeResponse } from "@/lib/net/safe-fetch";

// The icon a website declares itself, for sites Google's and DuckDuckGo's favicon services do not know (many local
// businesses): its home page's <link rel="icon"> and "apple-touch-icon" tags, then /favicon.ico. Read through
// safeFetch, so only public addresses are reached, every redirect is checked and nothing large is read.

type Fetcher = (url: string, options: { timeoutMs: number; maxBytes: number; maxRedirects: number }) => Promise<SafeResponse>;
export type OwnIcon = { body: ArrayBuffer; type: string };

const PAGE_BYTES = 300 * 1024;
const ICON_BYTES = 100 * 1024;
const PAGE_TIMEOUT_MS = 5000;
const ICON_TIMEOUT_MS = 4000;
const MAX_TRIES = 4;

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find((v) => v !== undefined) ?? null;

/** The icons a page declares, best first: apple-touch-icon (larger, usually the logo), then the largest others. */
export function iconLinks(html: string, base: string): string[] {
  const found: { url: string; rank: number }[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const href = attr(tag, "href");
    if (!href || !/\bicon\b|apple-touch-icon/.test(rel) || rel.includes("mask-icon")) continue;
    let url: string;
    try {
      url = new URL(href.trim(), base).toString();
    } catch {
      continue;
    }
    if (!/^(https?:|data:image\/)/i.test(url)) continue;
    const size = Math.max(0, ...(attr(tag, "sizes") ?? "").split(/\s+/).map((s) => Number(s.split(/x/i)[0]) || 0));
    found.push({ url, rank: (rel.includes("apple-touch-icon") ? 1000 : 0) + Math.min(size, 512) });
  }
  return [...new Set(found.sort((a, b) => b.rank - a.rank).map((f) => f.url))];
}

const SIGNATURES: [number[], string][] = [
  [[0x89, 0x50, 0x4e, 0x47], "image/png"],
  [[0x00, 0x00, 0x01, 0x00], "image/x-icon"],
  [[0x47, 0x49, 0x46, 0x38], "image/gif"],
  [[0xff, 0xd8, 0xff], "image/jpeg"],
];

/** What the bytes are, when the server's type is missing or vague; null when they are not an image. */
export function imageType(bytes: Buffer, declared: string): string | null {
  const type = declared.split(";")[0].trim().toLowerCase();
  for (const [sig, kind] of SIGNATURES) if (sig.every((b, i) => bytes[i] === b)) return kind;
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(bytes.subarray(0, 512).toString("utf8"))) return "image/svg+xml";
  return type.startsWith("image/") && type !== "image/svg+xml" ? type : null;
}

function fromDataUrl(url: string): OwnIcon | null {
  const m = url.match(/^data:(image\/[a-z0-9.+-]+)(;base64)?,(.*)$/i);
  if (!m) return null;
  const bytes = m[2] ? Buffer.from(m[3], "base64") : Buffer.from(decodeURIComponent(m[3]), "utf8");
  const type = imageType(bytes, m[1]);
  return type && bytes.length > 0 && bytes.length <= ICON_BYTES ? { body: new Uint8Array(bytes).buffer, type } : null;
}

/** The icon at a URL; null when it is missing or not an image; "failed" when it could not be fetched this time. */
async function iconAt(url: string, fetcher: Fetcher): Promise<OwnIcon | null | "failed"> {
  if (url.startsWith("data:")) return fromDataUrl(url);
  const res = await fetcher(url, { timeoutMs: ICON_TIMEOUT_MS, maxBytes: ICON_BYTES + 1, maxRedirects: 3 }).catch(() => "failed" as const);
  if (res === "failed") return "failed";
  if (!res.ok || res.bytes.length === 0 || res.bytes.length > ICON_BYTES) return null;
  const type = imageType(res.bytes, res.contentType);
  return type ? { body: new Uint8Array(res.bytes).buffer, type } : null;
}

/**
 * The site's own icon; "none" when its page was read and declares none that loads; "failed" when the page or an icon
 * could not be fetched this time (timeout, dropped connection), so the caller remembers nothing and asks again later.
 */
export async function ownSiteIcon(host: string, fetcher: Fetcher = defaultFetch): Promise<OwnIcon | "none" | "failed"> {
  let failed = false;
  for (const start of [`https://${host}/`, `https://www.${host}/`]) {
    const page = await fetcher(start, { timeoutMs: PAGE_TIMEOUT_MS, maxBytes: PAGE_BYTES, maxRedirects: 4 }).catch(() => "failed" as const);
    if (page === "failed") {
      failed = true;
      continue;
    }
    if (!page.ok || !/html/i.test(page.contentType)) continue;
    const candidates = [...iconLinks(page.text, page.url), new URL("/favicon.ico", page.url).toString()];
    let iconFailed = false;
    for (const url of [...new Set(candidates)].slice(0, MAX_TRIES)) {
      const icon = await iconAt(url, fetcher);
      if (icon === "failed") iconFailed = true;
      else if (icon) return icon;
    }
    return iconFailed ? "failed" : "none";
  }
  return failed ? "failed" : "none";
}
