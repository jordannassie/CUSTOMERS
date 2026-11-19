// The business's logo from its home page HTML, for the business switcher (2026-10-17). It is read from the HTML
// auto-fill already fetches, so it costs no extra request. Pure, so every pick is unit tested.
//
// The mark is a small square, so a square icon made for it wins over a wide wordmark: the touch icon first, then the
// logo the page declares for search engines, then an image named "logo", then the largest favicon.

const MAX_URL_LENGTH = 2_000;

type Candidate = { url: string; rank: number; size: number };

const attr = (tag: string, name: string): string | null => {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[1] ?? match[2] ?? match[3] ?? "").trim() : null;
};

/** HTML entities in an attribute: &amp; and numeric ones such as &#038; (WordPress) or &#x2F;. */
const decode = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, "&");

/** An https address for the logo, or null for data URIs, scripts and anything else that is not an image link. */
function absolute(raw: string, domain: string): string | null {
  const value = decode(raw).trim();
  if (!value || value.startsWith("data:") || value.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(value, `https://${domain}/`);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The biggest side in a sizes attribute ("180x180", "16x16 32x32"); 0 when unknown, "any" counts as large. */
function sizeOf(sizes: string | null): number {
  if (!sizes) return 0;
  if (/\bany\b/i.test(sizes)) return 512;
  return Math.max(0, ...[...sizes.matchAll(/(\d+)x(\d+)/gi)].map((m) => Math.min(Number(m[1]), Number(m[2]))));
}

function linkIcons(html: string): Candidate[] {
  return [...html.matchAll(/<link\b[^>]*>/gi)].flatMap(([tag]) => {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const href = attr(tag, "href");
    if (!href) return [];
    const size = sizeOf(attr(tag, "sizes"));
    if (/\bapple-touch-icon(-precomposed)?\b/.test(rel)) return [{ url: href, rank: 0, size: size || 180 }];
    if (/(^|\s)icon\b/.test(rel)) return [{ url: href, rank: 3, size: /\.svg(\?|$)/i.test(href) ? 512 : size }];
    return [];
  });
}

/** "logo" in JSON-LD (Organization, LocalBusiness and their @graph), as a string or an ImageObject. */
function jsonLdLogos(html: string): Candidate[] {
  const found: Candidate[] = [];
  const visit = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object" || depth > 6) return;
    if (Array.isArray(node)) return node.forEach((n) => visit(n, depth + 1));
    const record = node as Record<string, unknown>;
    const logo = record.logo;
    const url = typeof logo === "string" ? logo : logo && typeof logo === "object" ? (logo as Record<string, unknown>).url : null;
    if (typeof url === "string") found.push({ url, rank: 1, size: 0 });
    for (const value of Object.values(record)) if (value && typeof value === "object") visit(value, depth + 1);
  };
  for (const [, body] of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(body), 0);
    } catch {
      // A broken block on someone else's site: skip it.
    }
  }
  return found;
}

/** The first image whose address, class, id or alt says "logo", which is nearly always the header's. */
function logoImage(html: string): Candidate[] {
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = attr(tag, "src") ?? attr(tag, "data-src");
    if (!src) continue;
    const named = [src, attr(tag, "class"), attr(tag, "id"), attr(tag, "alt")].some((v) => v && /logo/i.test(v));
    if (named) return [{ url: src, rank: 2, size: 0 }];
  }
  return [];
}

/** The logo's https address, or null when the page names none. */
export function logoFromHtml(html: string | null | undefined, domain: string): string | null {
  if (!html) return null;
  const head = html.slice(0, 400_000);
  const candidates = [...linkIcons(head), ...jsonLdLogos(head), ...logoImage(head)]
    // Tiny favicons look blurry even in a 24px mark at 2x; keep them only as the last choice.
    .map((c) => (c.rank === 3 && c.size > 0 && c.size < 32 ? { ...c, rank: 4 } : c))
    .sort((a, b) => a.rank - b.rank || b.size - a.size);
  for (const candidate of candidates) {
    const url = absolute(candidate.url, domain);
    if (url) return url;
  }
  return null;
}
