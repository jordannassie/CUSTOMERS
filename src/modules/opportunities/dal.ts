import "server-only";
// The Actions page's extras (B-52): the "get found by AI" checklist and "Pick your branch on Google". The fixes
// themselves are read by board/dal.ts. The writes here only change a status or tick a checklist item, after checking
// the business is the agency's.
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { needsBranch, notSearched, showClaimStep, type BranchSearch } from "@/modules/onboarding/server";
import {
  CHECKLIST_PREFIX,
  CHECKLIST_TITLES,
  checklist,
  checklistKeyOf,
  missingBasics,
  noBranchQuery,
  type ChecklistItem,
  type ChecklistKey,
} from "./checklist";
import { toDbStatus, type Status } from "./service";

export type ActionsExtras = {
  /** Null when the business has its basics; the checklist is only for those missing some (MVP_SPEC 7.3). */
  checklist: { missing: string[]; items: ChecklistItem[] } | null;
  /**
   * "Pick your branch on Google" for a chain with no listing yet (step 6d). Google is searched only when the owner
   * presses Search (2026-10-28), never on a visit: the card opens not searched, or with the saved search that found no
   * branch, which also puts the claim step in the checklist.
   */
  branch: BranchSearch | null;
};

/** The business row and its checklist ticks, nothing else; null when the business is not the agency's. */
export async function getActionsExtras(businessId: string): Promise<ActionsExtras | null> {
  const { agency } = await requireAgency({ next: "/actions" });
  const db = createServiceClient();
  const [{ data: b, error }, ticks] = await Promise.all([
    db
      .from("businesses")
      .select("name, primary_city, primary_region, industry, services, phone, domain, has_website, places_id, is_chain")
      .eq("id", businessId)
      .eq("agency_id", agency.id)
      .maybeSingle(),
    db.from("opportunities").select("affected_url, status, evidence_data").eq("business_id", businessId).like("affected_url", `${CHECKLIST_PREFIX}%`),
  ]);
  if (error) throw new Error(`Opportunities: could not read the business: ${error.message}`);
  if (ticks.error) throw new Error(`Opportunities: could not read the checklist: ${ticks.error.message}`);
  if (!b) return null;

  const ticked = new Set<string>();
  for (const row of ticks.data) {
    const key = checklistKeyOf(row.affected_url);
    if (key && row.status === "resolved") ticked.add(key);
  }

  // A chain has a branch to pick, not a profile to claim; the claim step waits for a search that finds none (step 6d).
  // That search's result is saved, so it holds after a reload without asking Google again (D-87).
  const own = { chain: b.is_chain, placesId: b.places_id };
  const search = needsBranch(own) ? branchSearch(b.name, b.primary_city, noBranchQuery(ticks.data)) : null;
  const branchPending = needsBranch(own) && !showClaimStep(own, search);
  const business = {
    name: b.name,
    city: b.primary_city,
    region: b.primary_region,
    industry: b.industry,
    services: b.services,
    phone: b.phone,
    domain: b.domain,
    hasWebsite: b.has_website,
    placesId: b.places_id,
    branchPending,
  };
  const missing = missingBasics(business);
  return {
    checklist: missing.length > 0 ? { missing, items: checklist(business, ticked) } : null,
    // The picker stays after "no branch found", so the owner can search again with other words.
    branch: search,
  };
}

/** The card as the page opens it: not searched yet, or the saved search that found no branch. */
function branchSearch(name: string, city: string | null, noBranch: string | null): BranchSearch {
  const fresh = notSearched(name, city);
  return noBranch === null ? fresh : { ...fresh, query: noBranch || fresh.query, searched: true };
}

async function ownsBusiness(agencyId: string, businessId: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (error) throw new Error(`Opportunities: could not read the business: ${error.message}`);
  return data !== null;
}

/** False when the opportunity is not one of this agency's. */
export async function updateStatus(agencyId: string, businessId: string, opportunityId: string, status: Status): Promise<boolean> {
  if (!(await ownsBusiness(agencyId, businessId))) return false;
  const { data, error } = await createServiceClient()
    .from("opportunities")
    .update({ status: toDbStatus(status), updated_at: new Date().toISOString() })
    .eq("id", opportunityId)
    .eq("business_id", businessId)
    .select("id");
  if (error) throw new Error(`Opportunities: could not change the status: ${error.message}`);
  return data.length > 0;
}

/** Ticked items are stored as done opportunities; unticking removes them. False when not the agency's business. */
export async function updateChecklistItem(agencyId: string, businessId: string, key: ChecklistKey, done: boolean): Promise<boolean> {
  if (!(await ownsBusiness(agencyId, businessId))) return false;
  const db = createServiceClient();
  const marker = `${CHECKLIST_PREFIX}${key}`;
  const { data: existing, error } = await db
    .from("opportunities")
    .select("id")
    .eq("business_id", businessId)
    .eq("affected_url", marker);
  if (error) throw new Error(`Opportunities: could not read the checklist: ${error.message}`);

  if (!done) {
    if (existing.length === 0) return true;
    const removed = await db.from("opportunities").delete().in("id", existing.map((r) => r.id));
    if (removed.error) throw new Error(`Opportunities: could not untick the item: ${removed.error.message}`);
    return true;
  }
  if (existing.length > 0) return true;
  const inserted = await db.from("opportunities").insert({
    business_id: businessId,
    title: CHECKLIST_TITLES[key],
    category: "local_presence",
    impact: "high",
    status: "resolved",
    affected_url: marker,
  });
  if (inserted.error) throw new Error(`Opportunities: could not tick the item: ${inserted.error.message}`);
  return true;
}
