// Code checks on what a reason claims (MVP_SPEC 7.2). The prompt states both rules; these catch a reason that
// still breaks them, so it is dropped instead of shown:
// - BUG-099: "you trail on rating" when the business's rating is higher than every competitor's.
// - BUG-100: "check your listing on abchomeandcommercial.com" when that is another plumber's own website.
// - BUG-087: "create a one-page website" for a business that has a website we could not read.
import type { ExplainInput } from "./facts";

export const DOMAIN = /\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|us|biz|info|app|dev|ai|example)\b/gi;

type Field = "review_count" | "rating" | "open_days";
type Competitor = ExplainInput["competitors"][number];

const GOOGLE_KEY = { review_count: "reviewCount", rating: "rating", open_days: "openDays" } as const;
const FIELD_LABEL: Record<Field, string> = { review_count: "Google reviews", rating: "Google rating", open_days: "open days" };
const FIELD_WORDS: Record<Field, RegExp> = {
  review_count: /\breviews\b|\breview_count\b/i,
  rating: /\bratings?\b|\bstars?\b/i,
  open_days: /\bopen(?:_| )days\b|\bdays (?:open|a week)\b|\bopen (?:more|fewer|less) days\b|\bopening hours\b/i,
};
const LOWER = /\b(?:lower|fewer|less|worse|weaker|behind|trail|trails|trailing|lag|lags|lagging|below)\b/i;
const HIGHER = /\b(?:higher|more|better|stronger|ahead|above)\b/i;
const THAN_YOU = /\bthan (?:you|yours|your)\b/i;
const TOKEN = /\{(c\d+)\.(?:review_count|rating|category|open_days)\}/g;
// "Mr. Rooter" does not end a sentence.
const SENTENCE_END = /(?<!\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|Inc|Co|Ltd|vs))[.?!]\s+|\n+/;

const LISTING = /\b(?:listings?|listed|claim|claimed|directory|search for your business|your business name on|your (?:details|profile|page) on)\b/i;

export function sentences(text: string): string[] {
  return text.split(SENTENCE_END).filter((s) => s.trim());
}

/** Fields the sentence says the business trails on: "you have fewer reviews", "they are open more days than you". */
function trailedFields(sentence: string): Field[] {
  const lower = LOWER.test(sentence);
  const higher = HIGHER.test(sentence);
  if (lower === higher) return [];
  const thanYou = THAN_YOU.test(sentence);
  if (lower === thanYou) return [];
  return (Object.keys(FIELD_WORDS) as Field[]).filter((f) => FIELD_WORDS[f].test(sentence));
}

function referenced(sentence: string, competitors: Competitor[]): Competitor[] {
  const keys = new Set([...sentence.matchAll(TOKEN)].map((m) => m[1]));
  return competitors.filter((c) => keys.has(c.key) || sentence.includes(c.name));
}

/** A claim that the business trails on a Google value must match who is actually ahead (BUG-099). */
export function comparisonIssues(texts: string[], input: ExplainInput): string[] {
  const withGoogle = input.competitors.filter((c) => c.google);
  if (withGoogle.length === 0) return [];
  const issues: string[] = [];
  for (const sentence of texts.flatMap(sentences)) {
    for (const field of trailedFields(sentence)) {
      const ahead = (c: Competitor) => c.google?.[GOOGLE_KEY[field]] === "they_are_ahead";
      const named = referenced(sentence, withGoogle);
      if (named.length > 0) {
        for (const c of named.filter((c) => !ahead(c))) issues.push(`says ${c.name} is ahead on ${FIELD_LABEL[field]}, but it is not`);
      } else if (!withGoogle.some(ahead)) {
        issues.push(`says competitors are ahead on ${FIELD_LABEL[field]}, but none is`);
      }
    }
  }
  return issues;
}

/** Asking for a listing is only right on a review site or directory, never on a business's own website (BUG-100). */
export function listingIssues(texts: string[], input: ExplainInput): string[] {
  const kinds = new Map(input.citations.sites.map((s) => [s.domain, s]));
  const issues: string[] = [];
  for (const sentence of texts.flatMap(sentences)) {
    if (!LISTING.test(sentence)) continue;
    for (const raw of sentence.match(DOMAIN) ?? []) {
      const site = kinds.get(raw.toLowerCase().replace(/^www\./, ""));
      if (!site || site.kind === "listing") continue;
      const what = site.kind === "news" ? "a news site" : `${site.owner ?? "another business"}'s own website`;
      issues.push(`asks for a listing on ${site.domain}, which is ${what}`);
    }
  }
  return issues;
}

const BUILD_SITE = /\b(?:create|build|make|set up|start|launch)\s+(?:a|an|your)\s+(?:simple\s+|basic\s+|new\s+|one-page\s+|one page\s+)*(?:website|site)\b|\bone-page website\b/i;

/** A business that has a website is never told to build one (BUG-087). */
export function websiteIssues(texts: string[], input: ExplainInput): string[] {
  if (!input.business.hasWebsite) return [];
  return texts.some((t) => BUILD_SITE.test(t)) ? ["tells a business with a website to build one"] : [];
}
