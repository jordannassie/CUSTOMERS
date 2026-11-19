import "server-only";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fixtureAutofillClients } from "../dev-fixtures";
import { onboardingFixtures } from "../dal";
import { duplicateBusiness } from "../duplicates";
import { createPlacesSearch, type SearchPlaces } from "../places";
import { listingChoices, listingQuery, type LinkResult, type ListingSearch } from "./service";

// "Link Google listing". Callers check the user may edit this agency first. Listings are searched live and only the
// picked place_id is written (D-73).

function liveSearch(): SearchPlaces | null {
  if (onboardingFixtures()) return fixtureAutofillClients.searchPlaces;
  return env.GOOGLE_PLACES_API_KEY ? createPlacesSearch(env.GOOGLE_PLACES_API_KEY) : null;
}

async function ownBusiness(agencyId: string, businessId: string) {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("name, primary_city, places_id")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Listing: could not read the business: ${error.message}`);
  return data;
}

async function ownCompetitor(businessId: string, competitorId: string) {
  const { data, error } = await createServiceClient()
    .from("business_competitors")
    .select("name, places_id, place_id")
    .eq("id", competitorId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(`Listing: could not read the competitor: ${error.message}`);
  return data;
}

/**
 * Google's listings for `query` (by default the name and the business's city), for the business or one of its
 * competitors. Null when either is not the agency's. A live Google search, so only when the owner asks.
 */
export async function findListings(
  agencyId: string,
  target: { businessId: string; competitorId?: string },
  query?: string,
  search = liveSearch(),
): Promise<ListingSearch | null> {
  const b = await ownBusiness(agencyId, target.businessId);
  if (!b) return null;
  const c = target.competitorId ? await ownCompetitor(target.businessId, target.competitorId) : null;
  if (target.competitorId && !c) return null;
  const q = query?.trim() || listingQuery(c?.name ?? b.name, b.primary_city);
  if (!search) return { query: q, choices: [], unavailable: true };
  try {
    return { query: q, choices: listingChoices(await search(q)), unavailable: false };
  } catch (error) {
    console.warn(`listing search for ${target.businessId}: ${error instanceof Error ? error.message : String(error)}`);
    return { query: q, choices: [], unavailable: true };
  }
}

/** Saves the picked listing for the business, only while it has none (a pick in another tab wins). */
export async function linkBusinessListing(agencyId: string, businessId: string, placeId: string): Promise<LinkResult> {
  const b = await ownBusiness(agencyId, businessId);
  if (!b) return "not_found";
  if (b.places_id) return "already_linked";
  const { data, error } = await createServiceClient()
    .from("businesses")
    .update({ places_id: placeId })
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .is("places_id", null)
    .is("deleted_at", null)
    .select("id");
  // Another business in this account already uses that listing (migration 067).
  if (duplicateBusiness(error)) return "duplicate";
  if (error) throw new Error(`Listing: could not save the business listing: ${error.message}`);
  return data.length === 0 ? "already_linked" : "saved";
}

/**
 * Saves the picked listing for one competitor, only while it has none. Refused when it is the business's own listing
 * or one another of its competitors already has, so a pick by mistake never compares a business with itself.
 */
export async function linkCompetitorListing(agencyId: string, businessId: string, competitorId: string, placeId: string): Promise<LinkResult> {
  const b = await ownBusiness(agencyId, businessId);
  if (!b) return "not_found";
  const c = await ownCompetitor(businessId, competitorId);
  if (!c) return "not_found";
  if (c.places_id || c.place_id) return "already_linked";
  if (b.places_id === placeId) return "your_listing";
  const db = createServiceClient();
  const taken = await db
    .from("business_competitors")
    .select("id")
    .eq("business_id", businessId)
    .or(`places_id.eq.${placeId},place_id.eq.${placeId}`)
    .limit(1);
  if (taken.error) throw new Error(`Listing: could not check the competitors: ${taken.error.message}`);
  if (taken.data.length > 0) return "taken";
  const { data, error } = await db
    .from("business_competitors")
    .update({ places_id: placeId })
    .eq("id", competitorId)
    .eq("business_id", businessId)
    .is("places_id", null)
    .select("id");
  if (error) throw new Error(`Listing: could not save the competitor listing: ${error.message}`);
  return data.length === 0 ? "already_linked" : "saved";
}
