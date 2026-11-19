import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { recountAfterNamesChange } from "@/modules/scanning";

// A competitor's website, typed by the user (D-73: Google's website is shown live and never saved). Saved in
// business_competitors.domain, which mention detection already reads. Users cannot write business_competitors
// (migration 047, SEC-10), so the business is checked as the agency's and the write uses the service role.

export type SaveWebsiteResult = { ok: true; domain: string | null } | { ok: false; status: 404; error: string };

export async function saveCompetitorWebsite(agencyId: string, businessId: string, competitorId: string, domain: string | null): Promise<SaveWebsiteResult> {
  const db = createServiceClient();
  const { data: business, error } = await db.from("businesses").select("id").eq("id", businessId).eq("agency_id", agencyId).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(`Could not load the business: ${error.message}`);
  if (!business) return { ok: false, status: 404, error: "Business not found." };

  const { data: rows, error: saveError } = await db
    .from("business_competitors")
    .update({ domain })
    .eq("id", competitorId)
    .eq("business_id", businessId)
    .select("id");
  if (saveError) throw new Error(`Could not save the website: ${saveError.message}`);
  if (rows.length === 0) return { ok: false, status: 404, error: "That competitor was removed. Reload the page." };
  // Saved answers are checked again, so an answer naming only the website counts at once (BUG-122).
  await recountAfterNamesChange(businessId);
  return { ok: true, domain };
}
