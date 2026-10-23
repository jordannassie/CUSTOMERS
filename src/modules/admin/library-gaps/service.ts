// Industries whose businesses get no question library yet (MVP_SPEC 5.3): Claude writes their questions directly,
// and admin lists them as candidates for a new library. "Other" labels are counted however they were typed, so the
// most used ones can be picked to become real industries later (2026-10-16). Pure.
import { INDUSTRY_LABELS, isIndustry } from "@/lib/industries";
import { isVagueOtherLabel, normaliseOtherLabel } from "@/lib/other-label";

export type LibraryGap = {
  /** The list label ("Coffee shop"), or the owner's own words for an "Other" industry, as most of them typed it. */
  label: string;
  /** True for one of our industries whose library has no active templates yet. */
  listed: boolean;
  businesses: number;
  /** An "Other" label too vague to become an industry ("Consultant"); saved before the details step refused them. */
  vague: boolean;
};

export const LIBRARY_GAPS_SHOWN = 8;

/** "Book-Store", "bookstores " and "BOOKSTORE" are one label: lower case, no punctuation or spaces, last word singular. */
export function otherLabelKey(label: string): string {
  const words = normaliseOtherLabel(label).split(" ");
  const last = words.length - 1;
  if (words[last].length > 3 && /[^siu]s$/.test(words[last])) words[last] = words[last].slice(0, -1);
  return words.join("");
}

type Spelling = { text: string; n: number };

/** Most businesses first; "Other" labels are grouped however they were typed and shown as most of them typed it. */
export function libraryGaps(industries: (string | null)[], covered: Set<string>): LibraryGap[] {
  const groups = new Map<string, LibraryGap & { spellings: Map<string, Spelling> }>();
  for (const raw of industries) {
    const industry = raw?.trim().replace(/\s+/g, " ");
    if (!industry || industry === "other" || covered.has(industry)) continue;
    const listed = isIndustry(industry);
    const key = listed ? industry : otherLabelKey(industry);
    if (!key) continue;
    const gap = groups.get(key) ?? { label: "", listed, businesses: 0, vague: !listed && isVagueOtherLabel(industry), spellings: new Map<string, Spelling>() };
    gap.businesses++;
    if (!listed) addSpelling(gap.spellings, industry);
    gap.label = listed ? INDUSTRY_LABELS[industry] : mostUsed(gap.spellings);
    groups.set(key, gap);
  }
  return [...groups.values()]
    .map((g): LibraryGap => ({ label: g.label, listed: g.listed, businesses: g.businesses, vague: g.vague }))
    .sort((a, b) => b.businesses - a.businesses || a.label.localeCompare(b.label));
}

/** Spellings that differ only in case count as one, shown capitalised when anyone typed it so. */
function addSpelling(spellings: Map<string, Spelling>, text: string) {
  const seen = spellings.get(text.toLowerCase());
  if (!seen) return void spellings.set(text.toLowerCase(), { text, n: 1 });
  seen.n++;
  if (/^\p{Lu}/u.test(text) && !/^\p{Lu}/u.test(seen.text)) seen.text = text;
}

/** The spelling most businesses typed; the first one typed on a tie. */
function mostUsed(spellings: Map<string, Spelling>): string {
  let best: Spelling = { text: "", n: 0 };
  for (const s of spellings.values()) if (s.n > best.n) best = s;
  return best.text;
}
