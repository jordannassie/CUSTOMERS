// "Link Google listing" (owner, 2026-11-17): a business or competitor with no Google listing (none picked at setup, a
// new website cleared it, or a competitor added by name) gets one from a Google search the owner runs. Only the
// picked place_id is saved (D-73); the names and addresses are shown live. Pure; the search and the save are in dal.ts.
import type { PlaceCandidate } from "../places";

export const MAX_LISTING_CHOICES = 5;

/** Shown live from Google and never stored. */
export type ListingChoice = { placeId: string; name: string; address: string | null };

export type ListingSearch = {
  /** What was searched, so the box can show it. */
  query: string;
  choices: ListingChoice[];
  /** Google could not be searched: not the same as "no listing found". */
  unavailable: boolean;
};

/** The first search: the name, then the city the business is in ("Bean House Austin"). */
export function listingQuery(name: string, city: string | null): string {
  return [name.trim(), city?.trim()].filter(Boolean).join(" ");
}

/** Google's top matches with a name, at most five, in Google's order. */
export function listingChoices(found: PlaceCandidate[]): ListingChoice[] {
  return found
    .filter((c) => c.name)
    .slice(0, MAX_LISTING_CHOICES)
    .map((c) => ({ placeId: c.placeId, name: c.name!, address: c.address }));
}

export type LinkResult = "saved" | "not_found" | "already_linked" | "duplicate" | "your_listing" | "taken";
