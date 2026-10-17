// "Pick your branch on Google" (step 6d): a chain's website matches listings in several cities, so auto-fill keeps no
// listing (BUG-117) and the business has no place_id. Instead of "Not matched" and "claim your profile", the owner
// picks their branch from a Google search. Pure; the search and the save are in dal.ts.
import type { PlaceCandidate } from "../places";
import { sameBrandSite } from "../autofill-safety";
import { sameSite } from "../service";

export const MAX_BRANCH_CHOICES = 5;

/** Shown live from Google and never stored; only the picked place_id is saved (D-73). */
export type BranchChoice = { placeId: string; name: string; address: string | null };

export type BranchSearch = {
  /** What was searched, "KFC Islamabad", so the box can show it. */
  query: string;
  choices: BranchChoice[];
  /** Google could not be searched: not the same as "no branch", so the claim step stays hidden. */
  unavailable: boolean;
};

/** A chain with no listing picked yet needs its branch; anything else uses its listing or the claim step. */
export function needsBranch(b: { chain: boolean; placesId: string | null }): boolean {
  return b.chain && !b.placesId;
}

export function branchQuery(name: string, city: string | null): string {
  return [name.trim(), city?.trim()].filter(Boolean).join(" ");
}

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * The listings that are this brand's branches: the website is the business's site (or its country version), or the
 * listing's name starts with the business's name ("KFC F-7 Markaz" for KFC). Others the search found are dropped.
 */
export function branchChoices(found: PlaceCandidate[], name: string, domain: string | null): BranchChoice[] {
  const brand = words(name);
  const ours = (c: PlaceCandidate) =>
    (domain !== null && (sameSite(c.websiteUri, domain) || sameBrandSite(c.websiteUri, domain))) ||
    (brand.length > 0 && c.name !== null && `${words(c.name)} `.startsWith(`${brand} `));
  return found
    .filter((c) => c.name && ours(c))
    .slice(0, MAX_BRANCH_CHOICES)
    .map((c) => ({ placeId: c.placeId, name: c.name!, address: c.address }));
}

/** The claim step is for a business Google does not list: never while its branch may still be picked. */
export function showClaimStep(b: { chain: boolean; placesId: string | null }, search: BranchSearch | null): boolean {
  if (!needsBranch(b)) return !b.placesId;
  return search !== null && !search.unavailable && search.choices.length === 0;
}
