// What a website says that customer questions often ask about (B-91 step 2): open 24/7, emergency work, free estimates,
// prices. Found in code with the page and the words around it, never by AI, so each one can be checked. Pure and
// import-free: the site reader finds them, the comparison matches them to questions.

export type ClaimKey =
  | "open_24_7"
  | "emergency"
  | "same_day"
  | "free_estimates"
  | "prices"
  | "financing"
  | "warranty"
  | "licensed"
  | "online_booking"
  | "delivery"
  | "years";

export type SiteClaim = { key: ClaimKey; label: string; page: string; quote: string };

export const CLAIMS: { key: ClaimKey; label: string; pattern: RegExp }[] = [
  { key: "open_24_7", label: "open 24/7", pattern: /\b24\s*\/\s*7\b|\b24 hours a day\b|\bopen 24 hours\b/i },
  { key: "emergency", label: "emergency service", pattern: /\bemergenc(y|ies)\b/i },
  { key: "same_day", label: "same-day service", pattern: /\bsame[- ]day\b/i },
  { key: "free_estimates", label: "free estimates", pattern: /\bfree (estimates?|quotes?|consultations?|inspections?)\b/i },
  { key: "prices", label: "prices", pattern: /\$\s?\d/ },
  { key: "financing", label: "financing", pattern: /\bfinancing\b|\bpayment plans?\b/i },
  { key: "warranty", label: "a warranty or guarantee", pattern: /\bwarrant(y|ies)\b|\bguarantee(d)?\b/i },
  { key: "licensed", label: "licensed or certified", pattern: /\blicensed\b|\bcertified\b|\binsured\b/i },
  { key: "online_booking", label: "online booking", pattern: /\b(book|schedule|reserve) (online|now|an appointment|a table)\b/i },
  { key: "delivery", label: "delivery", pattern: /\bdeliver(y|s)\b/i },
  { key: "years", label: "years in business", pattern: /\bsince (19|20)\d{2}\b|\b\d{1,3}\+? years (of experience|in business|serving)\b/i },
];

const QUOTE = 120;

/** The page as plain sentences: no markdown marks, links kept as their words, one line per block. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[ \t]*([#>*-]+|\d+[.)])[ \t]+/gm, "")
    .replace(/[*_`|]+/g, "");
}

/** The sentence or line that says it, cut to a short quote around the match. */
// A sentence ends at . ! or ? followed by a capital (so "Rs. 1,500" or "St. Louis" do not end it), or at a new line.
const SENTENCE_END = /[.!?](?=\s+["\u201c(]?[A-Z])|\n/g;

function quoteAt(text: string, at: number, length: number): string {
  let start = 0;
  let end = text.length;
  for (const m of text.matchAll(SENTENCE_END)) {
    if (m.index < at) start = m.index + 1;
    else if (m.index >= at + length) {
      end = m[0] === "\n" ? m.index : m.index + 1;
      break;
    }
  }
  let q = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (q.length > QUOTE) {
    const rel = Math.max(0, at - start - QUOTE / 2);
    q = q.slice(rel, rel + QUOTE).replace(/^\S*\s/, "").replace(/\s\S*$/, "");
  }
  return q;
}

/** How good a quote reads: a full sentence beats a menu label ("DELIVERY") or a page title ("Brand \\ Order online"). */
function quoteScore(q: string): number {
  const words = q.split(/\s+/).filter(Boolean).length;
  let score = Math.min(words, 20);
  if (words < 4) score -= 6;
  if (/[a-z]/i.test(q) && q === q.toUpperCase()) score -= 10;
  if (/[\\|]/.test(q)) score -= 5;
  if (/[.!?]$/.test(q)) score += 3;
  return score;
}

/** The best-reading quote for a match across the pages; the first page wins a tie. */
export function bestQuote(pages: { path: string; markdown: string }[], pattern: RegExp): { page: string; quote: string } | null {
  let best: { page: string; quote: string; score: number } | null = null;
  const all = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const p of pages) {
    const text = plainText(p.markdown);
    for (const m of text.matchAll(all)) {
      const quote = quoteAt(text, m.index, m[0].length);
      const score = quoteScore(quote);
      if (!best || score > best.score) best = { page: p.path, quote, score };
    }
  }
  return best && { page: best.page, quote: best.quote };
}

/** Each claim the pages make, once, with the best-reading quote. */
export function siteClaims(pages: { path: string; markdown: string }[]): SiteClaim[] {
  return CLAIMS.flatMap((claim) => {
    const found = bestQuote(pages, claim.pattern);
    return found ? [{ key: claim.key, label: claim.label, ...found }] : [];
  });
}

/** For display: a title's separators become commas and ALL CAPS reads as a sentence. The words stay theirs. */
export function tidyQuote(quote: string): string {
  let t = quote
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s*[\\|•·]\s*/g, ", ")
    .replace(/\s+[-\u2013\u2014]\s+/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .replace(/,\s*,/g, ",");
  if (/[a-z]/i.test(t) && t === t.toUpperCase()) t = t.charAt(0) + t.slice(1).toLowerCase();
  return t;
}

/** Which claims a question is about: "emergency plumber open now" asks for 24/7, emergency or same-day work. */
const NEEDS: { pattern: RegExp; claims: ClaimKey[] }[] = [
  { pattern: /\b(emergency|urgent|asap|24\s*\/?\s*7|24 hours?|open now|open late|tonight|same[- ]day)\b/i, claims: ["open_24_7", "emergency", "same_day"] },
  { pattern: /\b(affordable|cheap|cheapest|price|prices|cost|costs|budget|deal|fair|inexpensive)\b/i, claims: ["prices", "free_estimates", "financing"] },
  { pattern: /\b(best|top|rated|trusted|reliable|recommend|recommended|reputable|good)\b/i, claims: ["licensed", "warranty", "years"] },
  { pattern: /\b(book|booking|appointment|schedule|reservation|reserve)\b/i, claims: ["online_booking"] },
  { pattern: /\b(deliver|delivers|delivery)\b/i, claims: ["delivery"] },
  { pattern: /\b(estimate|estimates|quote|quotes)\b/i, claims: ["free_estimates"] },
];

export function claimsAskedBy(question: string): ClaimKey[] {
  return [...new Set(NEEDS.filter((n) => n.pattern.test(question)).flatMap((n) => n.claims))];
}

// Words that say nothing about what a business offers or where.
const STOP = new Set([
  "and", "the", "for", "with", "our", "your", "you", "all", "any", "near", "best", "top", "local", "more", "new", "free",
  "open", "from", "service", "services", "shop", "store", "company", "business", "available", "custom", "professional",
  "who", "what", "which", "where", "when", "how", "can", "does", "that", "this", "are", "has", "have", "most", "good",
  "recommend", "recommended", "locals", "nearby", "area", "around",
]);

/** The words that carry meaning, lower case and singular: "Office catering" gives office, catering. */
export function meaningWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])
    .filter((w) => !STOP.has(w))
    // Both sides go through the same rule, so "tires" meets "tire".
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

const MAX_WORDS = 3000;

/** Every meaning word on the pages, once, to see later whether a site mentions what a question asks. */
export function siteWords(pages: { markdown: string }[]): string[] {
  const words = new Set<string>();
  for (const p of pages) for (const w of meaningWords(p.markdown)) if (words.size < MAX_WORDS) words.add(w);
  return [...words];
}

/**
 * A long quote cut to the words around what it is quoted for: "...Select Your Order Type DeliveryPick-UpDine-In
 * Please select..." around "pick-up". Cut at word breaks, with an ellipsis on each cut side. Tidied first.
 */
export function quoteAround(quote: string, about: string, max = 110): string {
  const t = tidyQuote(quote);
  if (t.length <= max) return t;
  const lower = t.toLowerCase();
  const words = about.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3);
  const hits = [about.toLowerCase(), ...words].map((w) => lower.indexOf(w)).filter((i) => i >= 0);
  const at = hits.length > 0 ? hits[0] : 0;
  let start = Math.max(0, Math.min(at - Math.floor(max / 3), t.length - max));
  let end = Math.min(t.length, start + max);
  if (start > 0) start = t.indexOf(" ", start) + 1 || start;
  if (end < t.length) end = t.lastIndexOf(" ", end) > start ? t.lastIndexOf(" ", end) : end;
  const cut = t.slice(start, end).replace(/[,\s]+$/, "");
  return `${start > 0 ? "…" : ""}${cut}${end < t.length ? "…" : ""}`;
}
