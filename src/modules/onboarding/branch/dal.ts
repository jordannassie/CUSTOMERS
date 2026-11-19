import "server-only";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { fixtureAutofillClients } from "../dev-fixtures";
import { onboardingFixtures } from "../dal";
import { duplicateBusiness } from "../duplicates";
import { createPlacesSearch, type SearchPlaces } from "../places";
import { branchChoices, branchQuery, needsBranch, noBranchFound, noBranchRow, NO_BRANCH_MARKER, type BranchSearch } from "./service";

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
 * The chain's branches Google finds for `query` (by default its name and city): a live Google search, so only when
 * the owner presses Search, never on a page load. Null when the business is not the agency's, or is not a chain
 * waiting for its branch.
 */
export async function findBranches(agencyId: string, businessId: string, query?: string, search = liveSearch()): Promise<BranchSearch | null> {
  const b = await branchBusiness(agencyId, businessId);
  if (!b || !needsBranch({ chain: b.is_chain, placesId: b.places_id })) return null;
  const q = query?.trim() || branchQuery(b.name, b.primary_city);
  if (!search) return { query: q, choices: [], unavailable: true, searched: true };
  let found: BranchSearch;
  try {
    found = { query: q, choices: branchChoices(await search(q), b.name, b.domain), unavailable: false, searched: true };
  } catch (error) {
    console.warn(`branch search for ${businessId}: ${error instanceof Error ? error.message : String(error)}`);
    return { query: q, choices: [], unavailable: true, searched: true };
  }
  // The results still show if this fails; only the claim step after a reload depends on it.
  await rememberSearch(businessId, found).catch((error: unknown) =>
    console.warn(`branch search for ${businessId} not remembered: ${error instanceof Error ? error.message : String(error)}`),
  );
  return found;
}

/** "No branch found" is kept for the claim step (NO_BRANCH_MARKER); a search that finds branches clears it. */
async function rememberSearch(businessId: string, found: BranchSearch): Promise<void> {
  if (!noBranchFound(found)) return clearNoBranch(businessId);
  const db = createServiceClient();
  const row = noBranchRow(businessId, found.query);
  // Not an upsert: the unique key on (business_id, dedupe_key) is a partial index, which ON CONFLICT cannot name here.
  const updated = await db
    .from("opportunities")
    .update({ evidence_data: row.evidence_data, updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .eq("affected_url", NO_BRANCH_MARKER)
    .select("id");
  if (updated.error) throw new Error(`Branch: could not save the search: ${updated.error.message}`);
  if (updated.data.length > 0) return;
  const inserted = await db.from("opportunities").insert(row);
  // Two searches at once: the unique key let one in, which says the same.
  if (inserted.error && inserted.error.code !== "23505") throw new Error(`Branch: could not save the search: ${inserted.error.message}`);
}

async function clearNoBranch(businessId: string): Promise<void> {
  const { error } = await createServiceClient().from("opportunities").delete().eq("business_id", businessId).eq("affected_url", NO_BRANCH_MARKER);
  if (error) throw new Error(`Branch: could not clear the search: ${error.message}`);
}

export type SaveBranchResult = "saved" | "not_found" | "not_needed" | "duplicate";

/**
 * Saves the picked branch's place_id, and nothing else from Google. Only for one of the agency's chains still waiting
 * for its branch ("not_needed" otherwise); "duplicate" when another of the agency's businesses uses that listing
 * (migration 067).
 */
export async function saveBranch(agencyId: string, businessId: string, placeId: string): Promise<SaveBranchResult> {
  const b = await branchBusiness(agencyId, businessId);
  if (!b) return "not_found";
  if (!needsBranch({ chain: b.is_chain, placesId: b.places_id })) return "not_needed";
  const { data, error } = await createServiceClient()
    .from("businesses")
    .update({ places_id: placeId })
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .eq("is_chain", true)
    .is("places_id", null)
    .is("deleted_at", null)
    .select("id");
  if (duplicateBusiness(error)) return "duplicate";
  if (error) throw new Error(`Branch: could not save the listing: ${error.message}`);
  // Picked in another tab a moment ago.
  if (data.length === 0) return "not_needed";
  await clearNoBranch(businessId);
  return "saved";
}
