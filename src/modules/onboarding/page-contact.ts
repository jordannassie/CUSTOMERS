// The footer of a business's page, from Firecrawl's raw HTML. Firecrawl's main-content markdown drops footers, and
// most small business sites put their phone, address and hours there, so without it auto-fill missed them and
// advice said "your website does not show your phone number" when it did (BUG-138). Pure.

const MAX_FOOTER_CHARS = 2_000;

// <footer>, role="contentinfo", or an element whose class or id is a footer (Webflow's div class="footer").
const FOOTER_START = /<footer\b|<[a-z][a-z0-9]*\b[^>]*\b(?:role="contentinfo"|(?:class|id)="(?:[^"]*\s)?[a-z-]*footer[a-z-]*(?:\s[^"]*)?")/i;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

/**
 * The page's contact lines and the visible text of its footer, one line per block, or "" when it has neither.
 * Tap-to-call numbers and structured data come first: they are the surest signal, and a footer can open with a long
 * map widget that would push its phone past the limit (atxfamilydental.com).
 */
export function footerText(html: string | null | undefined): string {
  if (!html) return "";
  const contact = contactLinesFromHtml(html);
  const clean = html.replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  const start = clean.search(FOOTER_START);
  const end = start < 0 ? -1 : clean.toLowerCase().indexOf("</body>", start);
  const footer = start < 0 ? "" : htmlToLines(clean.slice(start, end < 0 ? undefined : end));
  return [...contact, footer].filter(Boolean).join("\n").slice(0, MAX_FOOTER_CHARS);
}

const decode = (s: string) => s.replace(/&(#?[a-z0-9]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m).trim();

function contactLinesFromHtml(html: string): string[] {
  const phones = [...html.matchAll(/href=["']tel:([^"']+)["']/gi)].map((m) => decode(decodeURIComponent(m[1])));
  const ld = [...html.matchAll(/"telephone"\s*:\s*"([^"]{7,30})"/g)].map((m) => decode(m[1]));
  const streets = [...html.matchAll(/"streetAddress"\s*:\s*"([^"]{4,120})"/g)].map((m) => `Address: ${decode(m[1])}`);
  const unique = [...new Set([...phones, ...ld].filter((p) => p.replace(/\D/g, "").length >= 7))];
  return [...unique.slice(0, 3).map((p) => `Phone: ${p}`), ...[...new Set(streets)].slice(0, 2)];
}

function htmlToLines(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|h[1-6]|section|footer|tr|address)>/gi, "\n")
    // Attribute values may hold ">" (Tailwind's class="[&>li]:p-0"), so quoted values are skipped whole.
    .replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, " ")
    .replace(/&(#?[a-z0-9]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// "(512) 996-1516", "512.996.1516", "+44 20 7946 0958", "+92 51 1234567". Seven to fifteen digits in all.
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]\d{3,4}[\s.-]?\d{3,4}\b/g;

// A street line: "5330 Menchaca Rd", "221 W North Loop Blvd, Austin".
const STREET = /\b\d{1,5}\s+(?:[NSEW]\.?\s+)?[A-Z][\w.'-]*(?:\s+[A-Z][\w.'-]*){0,3}\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Hwy|Highway|Pkwy|Parkway|Pl|Place|Ct|Court|Speedway)\b/;

/**
 * Lines of a long page that show a phone or a street address, for the part past what the model is given: Reverie
 * Books' address sits at character 11,207 of its home page, after the 8,000 the model reads.
 */
export function contactLinesIn(text: string, max = 5): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && l.length <= 200);
  return [...new Set(lines.filter((l) => showsPhone(l) || STREET.test(l)))].slice(0, max);
}

/** Whether the text shows something that reads as a phone number. */
export function showsPhone(text: string): boolean {
  return (text.match(PHONE) ?? []).some((m) => {
    const n = m.replace(/\D/g, "").length;
    return n >= 7 && n <= 15;
  });
}

type ReadPage = { path: string; markdown: string; footer?: string };

/** The pages for the model, with the footer given once: every page of a site repeats the same one. */
export function withFooterOnce(pages: ReadPage[]): ReadPage[] {
  const seen = new Set<string>();
  return pages.map(({ path, markdown, footer }) => {
    if (!footer || seen.has(footer)) return { path, markdown };
    seen.add(footer);
    return { path, markdown, footer };
  });
}

/**
 * Whether the site shows a phone number and an address: what the model read from it, or for the phone, a number
 * anywhere in the pages and footers. Null when the model read nothing, since then we cannot say.
 */
export function siteContact(
  facts: { phone: string; address: string } | null,
  pages: ReadPage[],
): { hasPhone: boolean; hasAddress: boolean } | null {
  if (!facts) return null;
  const text = pages.map((p) => `${p.markdown}\n${p.footer ?? ""}`).join("\n");
  return { hasPhone: facts.phone.trim() !== "" || showsPhone(text), hasAddress: facts.address.trim() !== "" };
}
