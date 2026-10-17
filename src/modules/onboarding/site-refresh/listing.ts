// The business's own Google listing, looked for again after a scan when setup could not match it (BUG-158: Google
// was over its daily limit, so no place_id was saved and the checklist said "We couldn't confirm a Google Business
// Profile" for good). Only the place ID, or that the site is a chain's, is kept (D-73). Pure; the search is injected.
import type { PlaceCandidate, SearchPlaces } from "../places";
import { isChain, pickPlaceForDomain } from "../service";

export type ListingMatch = { placesId: string } | { chain: true } | null;

/** Looked for only for a real business with a website, no listing yet, and not known to be a chain. */
export function needsListing(b: { domain: string | null; hasWebsite: boolean | null; placesId: string | null; chain: boolean }): boolean {
  return !!b.domain && b.hasWebsite !== false && !b.placesId && !b.chain;
}

/** One search by the website's domain, as auto-fill does. Throws when Places fails, so the caller can record it. */
export async function findListing(domain: string, search: SearchPlaces): Promise<ListingMatch> {
  const found: PlaceCandidate[] = await search(domain);
  if (isChain(found, domain)) return { chain: true };
  const place = pickPlaceForDomain(found, domain);
  return place ? { placesId: place.placeId } : null;
}
