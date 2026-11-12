import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { emailsOf } from "../../businesses/dal";
import { distinctLabels } from "../service";

export type ScanFilterOptions = {
  agencies: { id: string; label: string }[];
  businesses: { id: string; label: string; agencyId: string | null }[];
};

// Enough for every agency and business today; the lists are for picking one, so they stay light (id and label).
const OPTION_LIMIT = 1000;

/**
 * The agencies and businesses the Scans page can filter to. A name that repeats gets a hint so the two can be told
 * apart (admin audit 2026-11-12): an agency its owner's email, a business its agency and city.
 */
export async function listScanFilterOptions(): Promise<ScanFilterOptions> {
  await requireAdmin();
  const db = createServiceClient();
  const [agencies, businesses] = await Promise.all([
    db.from("agencies").select("id, name, owner_user_id").neq("status", "deleted").order("name").limit(OPTION_LIMIT),
    db.from("businesses").select("id, name, agency_id, primary_city").is("deleted_at", null).order("name").limit(OPTION_LIMIT),
  ]);
  if (agencies.error) throw new Error(`Scans: ${agencies.error.message}`);
  if (businesses.error) throw new Error(`Scans: ${businesses.error.message}`);

  const repeats = <T extends { name: string }>(rows: T[]) => {
    const seen = new Map<string, number>();
    for (const r of rows) seen.set(r.name.trim().toLowerCase(), (seen.get(r.name.trim().toLowerCase()) ?? 0) + 1);
    return rows.filter((r) => (seen.get(r.name.trim().toLowerCase()) ?? 0) > 1);
  };
  // Owner emails only for the agencies that need them: one call per 200 owners.
  const emails = await emailsOf(repeats(agencies.data).map((a) => a.owner_user_id));
  const agencyName = new Map(agencies.data.map((a) => [a.id, a.name]));

  const agencyOptions = distinctLabels(agencies.data.map((a) => ({ id: a.id, name: a.name, hint: emails.get(a.owner_user_id) ?? null })));
  const businessOptions = distinctLabels(
    businesses.data.map((b) => ({
      id: b.id,
      name: b.name,
      agencyId: b.agency_id,
      hint: [b.agency_id ? agencyName.get(b.agency_id) : null, b.primary_city].filter(Boolean).join(", ") || null,
    })),
  );
  return {
    agencies: agencyOptions.map((a) => ({ id: a.id, label: a.label })),
    businesses: businessOptions.map((b) => ({ id: b.id, label: b.label, agencyId: b.agencyId })),
  };
}
