// Small wording helpers for the version 2 report (docs/design/WRITING.md: digits, sentence case, no long dashes). Pure.

/** "A", "A and B", "A, B and C". */
export function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** "1 answer", "3 answers". */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Whole percent, rounded once. 0 when there is nothing to divide by. */
export const percent = (n: number, total: number) => (total === 0 ? 0 : Math.round((100 * n) / total));

/** "Your website" reads "your website" inside a sentence; brand names keep their capitals. */
export function inSentence(label: string): string {
  return GENERIC.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}
const GENERIC = /^(Your |Other |Website|Review sites|Delivery apps|Blogs|Social|Directories|Local )/;

/** First letter in capitals, the rest as written. */
export const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Fix 3", "Fixes 1, 3 and 5". */
export function fixesLabel(ns: number[]): string {
  return ns.length === 1 ? `Fix ${ns[0]}` : `Fixes ${list(ns.map(String))}`;
}

/** "#3", "#3 and #5". */
export const fixRefs = (ns: number[]) => list(ns.map((n) => `#${n}`));

/** "Sep 29, 2026", in UTC like the scan days. */
export function longDate(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Pizza Hut" → "pizza-hut", for stable keys. */
export const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Long dashes are never allowed in report wording; anything typed by a person or an AI is cleaned the same way. */
export const noLongDashes = (text: string) => text.replace(/\s*[\u2013\u2014]\s*/g, ", ");
