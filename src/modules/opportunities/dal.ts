import "server-only";
// The Opportunities page (B-52). Reads go through insights, which fills Google values in live (D-73);
// the writes here only change a status or tick a checklist item, after checking the business is the agency's.
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { getLiveOpportunities } from "@/modules/insights";
import { CHECKLIST_PREFIX, CHECKLIST_TITLES, checklist, checklistKeyOf, missingBasics, type ChecklistItem, type ChecklistKey } from "./checklist";
import { toDbStatus, toItems, type OpportunityItem, type Status } from "./service";

export type OpportunitiesPage = {
  items: OpportunityItem[];
  /** Null when the business has its basics; the checklist is only for those missing some (MVP_SPEC 7.3). */
  checklist: { missing: string[]; items: ChecklistItem[] } | null;
};

/** The page for one of the signed-in agency's businesses; null when it is not theirs. */
export async function getOpportunitiesPage(businessId: string): Promise<OpportunitiesPage | null> {
  const { agency } = await requireAgency({ next: "/opportunities" });
  const { data: b, error } = await createServiceClient()
    .from("businesses")
    .select("name, primary_city, primary_region, industry, services, phone, domain, has_website, places_id")
    .eq("id", businessId)
    .eq("agency_id", agency.id)
    .maybeSingle();
  if (error) throw new Error(`Opportunities: could not read the business: ${error.message}`);
  if (!b) return null;

  const rows = (await getLiveOpportunities(businessId)) ?? [];
  const ticked = new Set<string>();
  const fixes = rows.filter((row) => {
    const key = checklistKeyOf(row.affected_url);
    if (key && row.status === "resolved") ticked.add(key);
    return key === null;
  });

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
  };
  const missing = missingBasics(business);
  return {
    items: toItems(fixes),
    checklist: missing.length > 0 ? { missing, items: checklist(business, ticked) } : null,
  };
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
