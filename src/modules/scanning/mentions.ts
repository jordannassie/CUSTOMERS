// Mention detection v2 (MVP_SPEC 5.5, D-08, D-66). Replaces the old substring match
// (removed in B-26), so "Ace" is no longer found inside "space".
import {
  brandForms,
  containsPhone,
  coreName,
  domainOf,
  findDomain,
  findName,
  isGenericName,
} from "./mention-text";
import { findPlace } from "./place-text";
import { findExactBrand, shortBrand } from "./short-brand";

export type MentionTarget = {
  name: string;
  aliases?: string[];
  website?: string | null;
  city?: string | null;
  phone?: string | null;
  /** D-08: businesses without a website always need the city or phone next to the name. */
  hasWebsite?: boolean;
  /**
   * Set when the tracked business is itself one branch of a chain ("Bennu Coffee on Congress"): the chain's name or
   * website alone is the chain, so it counts only with one of these places (the branch's, its area) nearby (step 7).
   */
  branch?: { places: string[] } | null;
};

export type MentionResult = {
  mentioned: boolean;
  /** 1-based list item of the first mention; null when not in a list. Stored, never shown as a rank (D-63). */
  position: number | null;
  matchedBy: "name" | "alias" | "domain" | null;
};

// How far either side of a generic name to look for the city, domain or phone.
const NEARBY_CHARS = 200;

const LIST_ITEM = /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*(?:\d{1,2}[.)]|[-*•])\s+/;

type Match = { at: number; by: "name" | "alias" | "domain" };

export function detectMention(answer: string, target: MentionTarget): MentionResult {
  const matches = findMatches(answer, target);
  if (matches.length === 0) return { mentioned: false, position: null, matchedBy: null };
  const inList = matches.find((m) => listPosition(answer, m.at) !== null);
  return {
    mentioned: true,
    position: inList ? listPosition(answer, inList.at) : null,
    matchedBy: matches[0].by,
  };
}

/** Same rules for the business and every tracked competitor (MVP_SPEC 5.5). */
export function detectMentions(answer: string, business: MentionTarget, competitors: MentionTarget[]) {
  return {
    business: detectMention(answer, business),
    competitors: competitors.map((c) => ({ name: c.name, ...detectMention(answer, c) })),
  };
}

/** The list item holding a name already known to be there (found by the extractor); null outside a list. */
export function phrasePosition(answer: string, name: string): number | null {
  for (const at of findName(answer, coreName(name))) {
    const position = listPosition(answer, at);
    if (position !== null) return position;
  }
  return null;
}

function findMatches(answer: string, target: MentionTarget): Match[] {
  const domain = domainOf(target.website);
  const noWebsite = target.hasWebsite === false;
  const matches: Match[] = [];

  // A branch's chain-only mentions (the brand, its website) need the branch's place nearby.
  const chainOnly = (at: number) => !!target.branch && !placeNearby(answer, at, target.branch.places);
  if (domain) for (const at of findDomain(answer, domain)) if (!chainOnly(at)) matches.push({ at, by: "domain" });

  const names = [
    { text: target.name, by: "name" as const, short: false },
    // "Radiant Plumbing" counts for "Radiant Plumbing, Air Conditioning, & Electrical" (BUG-097).
    ...brandForms(target).map((text) => ({ text, by: "name" as const, short: true })),
    ...(target.aliases ?? []).map((text) => ({ text, by: "alias" as const, short: false })),
  ];
  for (const { text, by, short } of names) {
    const core = coreName(text);
    if (!core) continue;
    // "KFC", "BMW", "H&M" written exactly so are the brand, not a word: no city needed (D-08 aside). Any other way
    // ("kfc" in lowercase prose) still needs the city, domain or phone nearby, like any short name.
    const brand = shortBrand(text);
    if (brand && !noWebsite) for (const at of findExactBrand(answer, brand)) if (!(short && chainOnly(at))) matches.push({ at, by });
    const needsSecondSignal = noWebsite || isGenericName(core);
    // A one-word name must still read as a name: "Sapphire" counts, "sapphire earrings" does not. So must a short
    // brand form: "First Light" counts, "at first light" does not. A short capitals brand already counted as written.
    const needsProperNoun = !brand && (needsSecondSignal || short || !core.includes(" "));
    for (const at of findName(answer, core)) {
      if (needsProperNoun && !isProperNounUse(answer, at, text)) continue;
      if (needsSecondSignal && !hasNearbySignal(answer, at, target, domain)) continue;
      if (short && chainOnly(at)) continue;
      matches.push({ at, by });
    }
  }
  // The exact brand and its normalised spelling can find the same place twice.
  const seen = new Set<number>();
  return matches.filter((m) => !seen.has(m.at) && seen.add(m.at)).sort((a, b) => a.at - b.at);
}

// "the best plumbing in town" is prose; "Best Plumbing" is a name. Only applied to generic and one-word names.
function isProperNounUse(answer: string, at: number, name: string): boolean {
  if (name === name.toLowerCase()) return true;
  const firstLetter = answer.slice(at).match(/[A-Za-z0-9]/)?.[0] ?? "";
  return firstLetter !== firstLetter.toLowerCase() || /[0-9]/.test(firstLetter) || writtenAsName(answer, at);
}

/**
 * A brand that styles itself in lowercase ("adidas") is still a name when the answer sets it out as one: in bold,
 * at the start of a list item or a heading (BUG-141). "adidas shoes" in running prose still is not.
 */
function writtenAsName(answer: string, at: number): boolean {
  const lineStart = answer.lastIndexOf("\n", at - 1) + 1;
  const before = answer.slice(lineStart, at);
  if (/^\s*(?:#{1,6}\s+|(?:\d{1,2}[.)]|[-*•])\s+)?(?:\*\*|__)?\s*$/.test(before) && before.trim() !== "") return true;
  // Inside a **bold** span on the same line.
  const opens = (before.match(/\*\*|__/g) ?? []).length;
  return opens % 2 === 1;
}

// How far around a chain's name to look for the branch's place: "Bennu Coffee ... on South Congress Ave".
const PLACE_BEFORE = 60;
const PLACE_AFTER = 200;

function placeNearby(answer: string, at: number, places: string[]): boolean {
  const nearby = `${answer.slice(Math.max(0, at - PLACE_BEFORE), at + PLACE_AFTER)}\n${listItemText(answer, at)}`;
  return places.some((p) => findPlace(nearby, p).length > 0);
}

function hasNearbySignal(answer: string, at: number, target: MentionTarget, domain: string | null): boolean {
  const nearby = `${answer.slice(Math.max(0, at - NEARBY_CHARS), at + NEARBY_CHARS)}\n${listItemText(answer, at)}`;
  if (target.city && findPlace(nearby, target.city).length > 0) return true;
  if (domain && findDomain(nearby, domain).length > 0) return true;
  return containsPhone(nearby, target.phone);
}

type ListLine = { start: number; end: number; indent: number; isItem: boolean };

function splitLines(answer: string): ListLine[] {
  const lines: ListLine[] = [];
  let start = 0;
  for (const text of answer.split("\n")) {
    const indent = text.length - text.trimStart().length;
    lines.push({ start, end: start + text.length, indent, isItem: LIST_ITEM.test(text) });
    start += text.length + 1;
  }
  return lines;
}

/** The top-level list item holding offset `at`, counted from 1; null outside a list. */
function listPosition(answer: string, at: number): number | null {
  const lines = splitLines(answer);
  const items = lines.filter((l) => l.isItem);
  if (items.length === 0) return null;
  const topIndent = Math.min(...items.map((l) => l.indent));

  let position: number | null = null;
  let count = 0;
  for (const line of lines) {
    const text = answer.slice(line.start, line.end);
    if (line.isItem && line.indent === topIndent) {
      count++;
      // Numbered lists use their own number, so a second list that restarts at 1 counts from 1.
      const numbered = text.match(/^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*(\d{1,2})[.)]/);
      position = numbered ? Number(numbered[1]) : count;
    } else if (text.trim() && !line.isItem && line.indent <= topIndent && !isContinuation(text)) {
      position = null;
    }
    if (at >= line.start && at <= line.end) return position;
  }
  return null;
}

// Lines that describe the item above them ("Phone: ...", "**Why:** ...") belong to that item.
function isContinuation(text: string): boolean {
  const t = text.trim();
  return /^(?:\*\*|__)?[A-Za-z][\w /]{0,30}(?:\*\*|__)?\s*:/.test(t) || /^[>|]/.test(t);
}

function listItemText(answer: string, at: number): string {
  const lines = splitLines(answer);
  const idx = lines.findIndex((l) => at >= l.start && at <= l.end);
  if (idx < 0) return "";
  let from = idx;
  while (from > 0 && !lines[from].isItem) from--;
  if (!lines[from].isItem) return "";
  let to = from + 1;
  while (to < lines.length && !lines[to].isItem) to++;
  return answer.slice(lines[from].start, lines[to - 1].end);
}
