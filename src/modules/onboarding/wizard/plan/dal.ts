import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { selectedPlan } from "../questions/dal";
import { overLimit } from "./limits";
import { PLAN_IDS, type PlanId } from "../steps";

// The plan a draft business is set up on, chosen on the last setup step (BUG-244). The choice is kept on the draft as
// requested_plan_id, the same field the new-business plan picker fills; entitlements, the card step's trial and
// Billing's setup add-on all read it from there. Callers check the user first; writes use the service role (SEC-10).

export type SetupPlanOption = {
  id: PlanId;
  name: string;
  priceCents: number;
  monthlyCredits: number;
  maxCompetitors: number | null;
  maxQuestions: number | null;
};

export type SetupPlanResult = { ok: true } | { ok: false; status: 404 | 409; error: string };

const isPlanId = (id: string | null | undefined): id is PlanId => (PLAN_IDS as readonly string[]).includes(id ?? "");

/** The plans a business can be set up on, cheapest first. */
export async function loadSetupPlans(): Promise<SetupPlanOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, price_cents, monthly_credits, max_competitors, max_questions")
    .in("id", [...PLAN_IDS])
    .eq("active", true)
    .order("price_cents");
  if (error) throw new Error(`Could not load plans: ${error.message}`);
  return data.flatMap((p) =>
    isPlanId(p.id) && p.price_cents !== null && p.monthly_credits !== null
      ? [{ id: p.id, name: p.name, priceCents: p.price_cents, monthlyCredits: p.monthly_credits, maxCompetitors: p.max_competitors, maxQuestions: p.max_questions }]
      : [],
  );
}

/** The plan chosen for this draft, else the one picked on the pricing page, else Starter (as entitlements read it). */
export async function draftPlanId(userId: string, businessId: string): Promise<PlanId> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("requested_plan_id")
    .eq("id", businessId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load business: ${error.message}`);
  if (isPlanId(data?.requested_plan_id)) return data.requested_plan_id;
  return (await selectedPlan(userId)) ?? "starter";
}

/** Keeps the plan on the draft. Refused when the draft already has more competitors or questions than it allows. */
export async function saveDraftPlan(userId: string, businessId: string, planId: PlanId): Promise<SetupPlanResult> {
  const db = createServiceClient();
  const [business, plan, competitors, questions] = await Promise.all([
    db.from("businesses").select("id").eq("id", businessId).eq("owner_user_id", userId).eq("status", "onboarding").maybeSingle(),
    db.from("plans").select("name, max_competitors, max_questions").eq("id", planId).eq("active", true).maybeSingle(),
    db.from("business_competitors").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    db.from("tracked_prompts").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true),
  ]);
  for (const r of [business, plan, competitors, questions]) if (r.error) throw new Error(`Could not change the plan: ${r.error.message}`);
  if (!business.data || !plan.data) return { ok: false, status: 404, error: "Business not found." };

  const over = overLimit(plan.data, competitors.count ?? 0, questions.count ?? 0);
  if (over) return { ok: false, status: 409, error: over };

  const { error } = await db.from("businesses").update({ requested_plan_id: planId }).eq("id", businessId).eq("owner_user_id", userId);
  if (error) throw new Error(`Could not change the plan: ${error.message}`);
  return { ok: true };
}
