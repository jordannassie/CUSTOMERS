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
  /** False until the owner presses Search: the page no longer searches Google on every visit (2026-10-28). */
  searched: boolean;
};

/** A chain with no listing picked yet needs its branch; anything else uses its listing or the claim step. */
export function needsBranch(b: { chain: boolean; placesId: string | null }): boolean {
  return b.chain && !b.placesId;
}

export function branchQuery(name: string, city: string | null): string {
  return [name.trim(), city?.trim()].filter(Boolean).join(" ");
}

/** The card before any search: the box filled with the name and city, no listings, and no "No branch matched". */
export function notSearched(name: string, city: string | null): BranchSearch {
  return { query: branchQuery(name, city), choices: [], unavailable: false, searched: false };
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

/**
 * The claim step is for a business Google does not list: never while its branch may still be picked, so for a chain
 * only after a search that worked and found none of its branches.
 */
export function showClaimStep(b: { chain: boolean; placesId: string | null }, search: BranchSearch | null): boolean {
  if (!needsBranch(b)) return !b.placesId;
  return search !== null && noBranchFound(search);
}

/** A search that worked and found none of the chain's branches; Google being down is not this. */
export function noBranchFound(search: BranchSearch): boolean {
  return search.searched && !search.unavailable && search.choices.length === 0;
}

/**
 * Saved when a search that worked found no branch, so the claim step still shows after a reload without asking Google
 * again (D-87). It is an opportunities row like the checklist ticks (no new table, D-43), with the words searched in
 * evidence_data.query; a later search that finds branches, or a picked branch, removes it. opportunities/checklist.ts
 * reads the same marker (modules share only index.ts and server.ts, so the text is kept in both, with a test each).
 */
export const NO_BRANCH_MARKER = "checklist:no_branch";

/** The marker row: Dismissed and added by the owner's search, so no list, count or report shows it as a fix. */
export function noBranchRow(businessId: string, query: string) {
  return {
    business_id: businessId,
    title: "Google lists no branch of this chain",
    category: "local_presence",
    impact: "low",
    status: "dismissed",
    source: "manual",
    affected_url: NO_BRANCH_MARKER,
    dedupe_key: NO_BRANCH_MARKER,
    evidence_data: { query },
  };
}
