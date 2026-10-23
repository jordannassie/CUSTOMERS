import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { stepNumber } from "../steps";
import { isAnotherBusiness, type NewIdentity } from "./service";

/**
 * Clears a draft business when setup moves to another website (or name and city): the old details, website facts,
 * competitors and suggested questions, and the "details confirmed" progress. Without this the details step kept
 * showing the old website's name, industry and description (2026-10-13). A draft has never been scanned, so nothing
 * scored is lost. Callers check the draft is the user's first. True when it started over.
 */
export async function restartIfAnotherBusiness(userId: string, businessId: string, next: NewIdentity): Promise<boolean> {
  const db = createServiceClient();
  const { data: draft, error } = await db
    .from("businesses")
    .select("domain, has_website, name, primary_city")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .eq("status", "onboarding")
    .maybeSingle();
  if (error) throw new Error(`Could not load the draft business: ${error.message}`);
  if (!draft || !isAnotherBusiness({ domain: draft.domain, hasWebsite: draft.has_website, name: draft.name, city: draft.primary_city }, next)) {
    return false;
  }
  const { error: resetError } = await db
    .from("businesses")
    .update({
      name: "domain" in next ? next.domain : next.name,
      industry: null,
      description: null,
      services: [],
      aliases: [],
      primary_city: "domain" in next ? null : next.city,
      primary_region: null,
      primary_country: null,
      primary_area: null,
      phone: null,
      places_id: null,
      // Back to "website done": the details are the new business's to confirm.
      onboarding_step: stepNumber("website") + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId)
    .eq("owner_user_id", userId);
  if (resetError) throw new Error(`Could not start the draft over: ${resetError.message}`);
  for (const [table, what] of [
    ["business_site_facts", "website facts"],
    ["business_competitors", "competitors"],
  ] as const) {
    const { error: e } = await db.from(table).delete().eq("business_id", businessId);
    if (e) throw new Error(`Could not clear the old ${what}: ${e.message}`);
  }
  // Removed rather than deleted, like every other question removal (step 9e); a draft has no answers anyway.
  const { error: q } = await db
    .from("tracked_prompts")
    .update({ active: false, removed_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .is("removed_at", null);
  if (q) throw new Error(`Could not clear the old questions: ${q.message}`);
  return true;
}
