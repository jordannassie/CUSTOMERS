import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { productIdFor } from "../catalog";
import type { PlanCredits } from "../webhooks/credits";
import type { PlanChangeContext } from "./planner";
import type { CancelReason } from "./schema";

// Reads for plan changes, as the service role. Callers pass the agency from requireAgency(), so every query
// is scoped to it. The Stripe webhook (B-42) saves the result of a change; the only writes here are the optional
// reason given when cancelling (migration 062) and a deleted business's plan row when Stripe has no plan to end.

export type PlanChangeData = { context: PlanChangeContext; plansByProduct: Map<string, PlanCredits> };

export async function loadPlanChangeData(agencyId: string): Promise<PlanChangeData> {
  const db = createServiceClient();
  const [agency, plans, businesses, items] = await Promise.all([
    db.from("agencies").select("status, stripe_subscription_id").eq("id", agencyId).single(),
    db
      .from("plans")
      .select("id, name, price_cents, monthly_credits, stripe_price_id, stripe_product_id")
      .not("price_cents", "is", null),
    db.from("businesses").select("id, name, deleted_at, requested_plan_id").eq("agency_id", agencyId),
    db.from("business_subscriptions").select("business_id, plan_id, stripe_subscription_item_id").eq("agency_id", agencyId),
  ]);
  if (agency.error) throw new Error(`Could not load agency: ${agency.error.message}`);
  if (plans.error) throw new Error(`Could not load plans: ${plans.error.message}`);
  if (businesses.error) throw new Error(`Could not load businesses: ${businesses.error.message}`);
  if (items.error) throw new Error(`Could not load business plans: ${items.error.message}`);

  const itemOf = new Map(items.data.map((i) => [i.business_id, i]));
  const plansByProduct = new Map<string, PlanCredits>();
  for (const p of plans.data) {
    const credits = { planId: p.id, monthlyCredits: p.monthly_credits ?? 0 };
    plansByProduct.set(productIdFor({ kind: "plan", id: p.id }), credits);
    if (p.stripe_product_id) plansByProduct.set(p.stripe_product_id, credits);
  }

  return {
    plansByProduct,
    context: {
      agencyId,
      agencyStatus: agency.data.status,
      subscriptionId: agency.data.stripe_subscription_id,
      plans: plans.data.map((p) => ({ id: p.id, name: p.name, priceCents: p.price_cents ?? 0, stripePriceId: p.stripe_price_id })),
      businesses: businesses.data.map((b) => ({
        id: b.id,
        name: b.name,
        planId: itemOf.get(b.id)?.plan_id ?? null,
        itemId: itemOf.get(b.id)?.stripe_subscription_item_id ?? null,
        deleted: b.deleted_at !== null,
        requestedPlanId: b.requested_plan_id,
      })),
    },
  };
}

/** Saves why the owner cancelled the plan or took a business off it, for admin. The business must be the agency's. */
export async function saveCancelReason(
  agencyId: string,
  input: { kind: "cancel" | "remove"; reason: CancelReason; businessId: string | null },
): Promise<void> {
  const db = createServiceClient();
  if (input.businessId) {
    const { data } = await db.from("businesses").select("id").eq("id", input.businessId).eq("agency_id", agencyId).maybeSingle();
    if (!data) return;
  }
  const { error } = await db
    .from("cancel_reasons")
    .insert({ agency_id: agencyId, business_id: input.businessId, kind: input.kind, reason: input.reason });
  if (error) throw new Error(`Could not save the cancel reason: ${error.message}`);
}

/**
 * Marks one business's plan row canceled when there is no Stripe plan left to end for it (no subscription, or Stripe
 * has none or a canceled one), so no webhook will. The account purge skips businesses with a row that is not canceled.
 */
export async function cancelBusinessPlanRow(agencyId: string, businessId: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("business_subscriptions")
    .update({ status: "canceled" })
    .eq("agency_id", agencyId)
    .eq("business_id", businessId)
    .neq("status", "canceled");
  if (error) throw new Error(`Could not cancel the business plan: ${error.message}`);
}

/** Admin alert (MVP_SPEC 22): a scheduled change was lost around a paid change and must be put back in Stripe. */
export async function raiseScheduleLost(message: string): Promise<void> {
  const { error } = await createServiceClient().rpc("raise_system_alert", {
    p_kind: "schedule_lost",
    p_severity: "critical",
    p_message: message,
    p_details: {},
  });
  if (error) throw new Error(`Could not raise the schedule_lost alert: ${error.message}`);
}
