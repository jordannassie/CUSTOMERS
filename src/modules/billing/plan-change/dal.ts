import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { productIdFor } from "../catalog";
import type { PlanCredits } from "../webhooks/credits";
import type { PlanChangeContext } from "./planner";

// Reads for plan changes, as the service role. Callers pass the agency from requireAgency(), so every query
// is scoped to it. Nothing here writes: the Stripe webhook (B-42) saves the result of a change.

export type PlanChangeData = { context: PlanChangeContext; plansByProduct: Map<string, PlanCredits> };

export async function loadPlanChangeData(agencyId: string): Promise<PlanChangeData> {
  const db = createServiceClient();
  const [agency, plans, businesses, items] = await Promise.all([
    db.from("agencies").select("status, stripe_subscription_id").eq("id", agencyId).single(),
    db
      .from("plans")
      .select("id, name, price_cents, monthly_credits, stripe_price_id, stripe_product_id")
      .not("price_cents", "is", null),
    db.from("businesses").select("id, name").eq("agency_id", agencyId),
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
      })),
    },
  };
}
