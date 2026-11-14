import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAgency } from "@/modules/auth";
import { recountAfterNamesChange } from "@/modules/scanning";
import { sameAliases } from "./service";

// Other names for tracked competitors (migration 055, MVP_SPEC 5.5): "KFC" counts for "Kentucky Fried Chicken".
// Users cannot write business_competitors (migration 047, SEC-10), so the business is checked as the agency's first
// and the write uses the service role.

export type CompetitorNames = { id: string; name: string; aliases: string[] };

async function agencyBusiness(agencyId: string, businessId: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("agency_id", agencyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the business: ${error.message}`);
  return data !== null;
}

/** The tracked competitors with their other names, oldest first; null when the business is not the agency's. */
export async function loadCompetitorAliases(agencyId: string, businessId: string): Promise<CompetitorNames[] | null> {
  if (!(await agencyBusiness(agencyId, businessId))) return null;
  const { data, error } = await createServiceClient()
    .from("business_competitors")
    .select("id, name, aliases")
    .eq("business_id", businessId)
    .order("created_at");
  if (error) throw new Error(`Could not load competitors: ${error.message}`);
  return data;
}

/** For the Manage competitors page. */
export async function getCompetitorAliases(businessId: string, next: string): Promise<CompetitorNames[] | null> {
  const { agency } = await requireAgency({ next });
  return loadCompetitorAliases(agency.id, businessId);
}

export type SaveAliasesResult = { ok: true; changed: number } | { ok: false; status: 404; error: string };

/**
 * Saves the other names of each listed competitor of the business. A competitor removed meanwhile in another tab is
 * skipped. When any list changed, saved answers are checked again so the score counts the new names at once.
 */
export async function saveCompetitorAliases(
  agencyId: string,
  businessId: string,
  list: { id: string; aliases: string[] }[],
): Promise<SaveAliasesResult> {
  const current = await loadCompetitorAliases(agencyId, businessId);
  if (!current) return { ok: false, status: 404, error: "Business not found." };
  let changed = 0;
  for (const { id, aliases } of list) {
    const row = current.find((c) => c.id === id);
    if (!row) continue;
    // The competitor's own name is already looked for.
    const names = aliases.filter((a) => a.toLowerCase() !== row.name.trim().toLowerCase());
    if (sameAliases(row.aliases, names)) continue;
    const { error } = await createServiceClient()
      .from("business_competitors")
      .update({ aliases: names })
      .eq("id", id)
      .eq("business_id", businessId);
    if (error) throw new Error(`Could not save a competitor's other names: ${error.message}`);
    changed++;
  }
  if (changed) await recountAfterNamesChange(businessId);
  return { ok: true, changed };
}
