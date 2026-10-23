import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { duplicateBusiness, type DuplicateKind } from "../../duplicates";
import { stepNumber } from "../steps";

// The website step's draft business (MVP_SPEC 3.1 step 3): made once per agency, found again on a double submit or a
// second tab, and never read again from the website or Google when nothing about it changed. Callers check the
// user and agency first; writes use the service role (owner tables are read only to users, SEC-10).

export type NewDraft = {
  userId: string;
  agencyId: string;
  name: string;
  domain: string | null;
  hasWebsite: boolean;
  city: string | null;
  step: number;
  plan: string | null;
  /** The browser's key for this attempt: the same attempt sent twice finds the draft it made. */
  createKey: string | null;
};

export type InsertDraftResult = { kind: "created"; id: string } | { kind: "exists" } | { kind: "duplicate"; rule: DuplicateKind };

/**
 * Inserts the draft. "exists" when this attempt (createKey) or another tab already made the agency's draft, so the
 * caller reuses that one; "duplicate" when another business in the agency already has this website (migration 067).
 */
export async function insertDraft(d: NewDraft): Promise<InsertDraftResult> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .insert({
      name: d.name,
      domain: d.domain,
      has_website: d.hasWebsite,
      ...(d.hasWebsite ? {} : { primary_city: d.city }),
      owner_user_id: d.userId,
      agency_id: d.agencyId,
      status: "onboarding",
      onboarding_step: d.step,
      requested_plan_id: d.plan,
      create_key: d.createKey,
    })
    .select("id")
    .single();
  if (!error) return { kind: "created", id: data.id };
  const rule = duplicateBusiness(error);
  if (rule === "draft") return { kind: "exists" };
  if (rule) return { kind: "duplicate", rule };
  // The unique (owner_user_id, create_key) index: this attempt already made its draft.
  if (error.code === "23505" && error.message.includes("create_key")) return { kind: "exists" };
  throw new Error(`Could not create business: ${error.message}`);
}

/** True when another live business in the agency already uses this website (a chain's branches may share one). */
export async function websiteTaken(agencyId: string, domain: string, exceptId: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("id")
    .eq("agency_id", agencyId)
    .ilike("domain", domain.replace(/[\\%_]/g, (c) => `\\${c}`))
    .is("deleted_at", null)
    .eq("is_chain", false)
    .neq("id", exceptId)
    .limit(1);
  if (error) throw new Error(`Could not check the website: ${error.message}`);
  return data.length > 0;
}

/**
 * True when auto-fill already ran for this draft as it is now and worked, so the website step sent again (Back, then
 * Continue with nothing changed) costs no AI or Firecrawl call: the details are confirmed, or the website was read
 * (its facts are saved), or (no website) a Google listing was picked. The details step refills from what is saved
 * (BUG-139). A run that failed (the site blocked us or did not load, our reader or AI was down, Google failed) saves
 * no facts, so the same website sent again runs auto-fill again (O1).
 */
export async function autofillDone(businessId: string): Promise<boolean> {
  const db = createServiceClient();
  const { data: b, error } = await db.from("businesses").select("onboarding_step, has_website, places_id").eq("id", businessId).maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (!b) return false;
  if ((b.onboarding_step ?? 0) > stepNumber("details")) return true;
  if (b.has_website === false) return b.places_id !== null;
  const facts = await db.from("business_site_facts").select("data").eq("business_id", businessId).maybeSingle();
  if (facts.error) throw new Error(`Could not load site facts: ${facts.error.message}`);
  return siteWasRead(facts.data?.data ?? null);
}

/** Saved site facts hold what the AI read; a site that turned us away saves only its pages, with facts null (BUG-087). */
export function siteWasRead(saved: unknown): boolean {
  if (typeof saved !== "object" || saved === null) return false;
  const facts = (saved as { facts?: unknown }).facts;
  return typeof facts === "object" && facts !== null;
}
