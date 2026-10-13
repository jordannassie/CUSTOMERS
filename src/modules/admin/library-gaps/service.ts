// Industries whose businesses get no question library yet (MVP_SPEC 5.3): Claude writes their questions directly,
// and admin lists them as candidates for a new library. Pure.
import { INDUSTRY_LABELS, isIndustry } from "@/lib/industries";

export type LibraryGap = {
  /** The list label ("Coffee shop"), or the owner's own words for an "Other" industry ("Bookstore"). */
  label: string;
  /** True for one of our industries whose library has no active templates yet. */
  listed: boolean;
  businesses: number;
};

export const LIBRARY_GAPS_SHOWN = 8;

/** Most businesses first; free-text industries are grouped however they were capitalised. */
export function libraryGaps(industries: (string | null)[], covered: Set<string>): LibraryGap[] {
  const groups = new Map<string, LibraryGap>();
  for (const raw of industries) {
    const industry = raw?.trim();
    if (!industry || industry === "other" || covered.has(industry)) continue;
    const listed = isIndustry(industry);
    const key = listed ? industry : industry.toLowerCase();
    const gap = groups.get(key) ?? { label: listed ? INDUSTRY_LABELS[industry] : industry, listed, businesses: 0 };
    gap.businesses++;
    groups.set(key, gap);
  }
  return [...groups.values()].sort((a, b) => b.businesses - a.businesses || a.label.localeCompare(b.label));
}
