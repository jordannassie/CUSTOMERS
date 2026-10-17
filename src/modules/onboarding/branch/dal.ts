import "server-only";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fixtureAutofillClients } from "../dev-fixtures";
import { onboardingFixtures } from "../dal";
import { createPlacesSearch, type SearchPlaces } from "../places";
import { branchChoices, branchQuery, needsBranch, type BranchSearch } from "./service";

// "Pick your branch on Google" (step 6d). Callers check the user may see this agency first. Listings are searched
// live and only the picked place_id is written (D-73).

function liveSearch(): SearchPlaces | null {
  if (onboardingFixtures()) return fixtureAutofillClients.searchPlaces;
  return env.GOOGLE_PLACES_API_KEY ? createPlacesSearch(env.GOOGLE_PLACES_API_KEY) : null;
}

async function branchBusiness(agencyId: string, businessId: string) {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("name, primary_city, domain, is_chain, places_id")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Branch: could not read the business: ${error.message}`);
  return data;
}

/**
 * The chain's branches Google finds for `query` (by default its name and city). Null when the business is not the
 * agency's, or is not a chain waiting for its branch.
 */
export async function findBranches(agencyId: string, businessId: string, query?: string, search = liveSearch()): Promise<BranchSearch | null> {
  const b = await branchBusiness(agencyId, businessId);
  if (!b || !needsBranch({ chain: b.is_chain, placesId: b.places_id })) return null;
  const q = query?.trim() || branchQuery(b.name, b.primary_city);
  if (!search) return { query: q, choices: [], unavailable: true };
  try {
    return { query: q, choices: branchChoices(await search(q), b.name, b.domain), unavailable: false };
  } catch (error) {
    console.warn(`branch search for ${businessId}: ${error instanceof Error ? error.message : String(error)}`);
    return { query: q, choices: [], unavailable: true };
  }
}

/** Saves the picked branch's place_id, and nothing else from Google. False when the business is not the agency's. */
export async function saveBranch(agencyId: string, businessId: string, placeId: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .update({ places_id: placeId })
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .select("id");
  if (error) throw new Error(`Branch: could not save the listing: ${error.message}`);
  return data.length > 0;
}
