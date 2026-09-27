// Google Places placeholders (MVP_SPEC 7.2, D-73). Claude writes {c1.review_count}; we store
// {competitor.<id>.review_count} so the text survives list changes; the page fills live values in.
import { openDays } from "./compare";
import type { Signals } from "./facts";

export const PLACE_FIELDS = ["review_count", "rating", "category", "open_days"] as const;
export type PlaceField = (typeof PLACE_FIELDS)[number];

const FIELD = PLACE_FIELDS.join("|");
const MODEL_TOKEN = new RegExp(`\\{(you|c\\d+)\\.(${FIELD})\\}`, "g");
const STORED_TOKEN = new RegExp(`\\{(business|competitor\\.[0-9a-f-]{36})\\.(${FIELD})\\}`, "g");
const ANY_BRACES = /\{[^{}\n]*\}/g;

export function placeholderFor(subject: string, field: PlaceField): string {
  return `{${subject}.${field}}`;
}

/** Every {...} in the text, known or not. */
export function bracesIn(text: string): string[] {
  return text.match(ANY_BRACES) ?? [];
}

export function stripPlaceholders(text: string): string {
  return text.replace(ANY_BRACES, " ");
}

/** Model keys to stored ids. Null when the text names a key we did not give. */
export function toStored(text: string, keys: Record<string, string>): string | null {
  let unknown = false;
  const out = text.replace(MODEL_TOKEN, (_, subject: string, field: string) => {
    if (subject === "you") return `{business.${field}}`;
    const id = keys[subject];
    if (!id) unknown = true;
    return `{competitor.${id}.${field}}`;
  });
  return unknown ? null : out;
}

export type Lookup = (subject: { business: true } | { competitorId: string }, field: PlaceField) => string | null;

export function formatSignal(s: Signals | null | undefined, field: PlaceField): string | null {
  if (!s) return null;
  if (field === "review_count") return s.reviewCount === null ? null : s.reviewCount.toLocaleString("en-US");
  if (field === "rating") return s.rating === null ? null : s.rating.toFixed(1);
  if (field === "category") return s.categories[0]?.toLowerCase() ?? null;
  const days = openDays(s.hours);
  return days === null ? null : String(days);
}

function fillSentence(sentence: string, lookup: Lookup): string | null {
  let missing = false;
  const out = sentence.replace(STORED_TOKEN, (_, subject: string, field: PlaceField) => {
    const value =
      subject === "business" ? lookup({ business: true }, field) : lookup({ competitorId: subject.slice("competitor.".length) }, field);
    if (value === null) missing = true;
    return value ?? "";
  });
  return missing ? null : out;
}

/**
 * Fills stored placeholders with live values. A sentence whose value Google cannot give right now
 * is left out rather than shown with a gap.
 */
export function fillPlaceholders(text: string, lookup: Lookup): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.?!])\s+/)
        .map((s) => fillSentence(s, lookup))
        .filter((s): s is string => s !== null)
        .join(" "),
    )
    .filter((line, i, lines) => line.trim() !== "" || lines.length === 1)
    .join("\n");
}
