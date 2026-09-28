import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

// Reads for the billing page (B-46), as the service role. Callers pass the agency from requireAgency(), so every
// query is scoped to it. Plans per business come from business_subscriptions, which the Stripe webhook keeps.

export type BillingRows = {
  agency: {
    status: string;
    trialEndsAt: string | null;
    periodEndsAt: string | null;
    subscriptionId: string | null;
    customerId: string | null;
  };
  plans: { id: string; name: string; priceCents: number; monthlyCredits: number }[];
  /** Set up businesses, oldest first. planId is null when the business is not on the plan. */
  businesses: { id: string; name: string; planId: string | null; itemId: string | null }[];
};

export async function loadBillingRows(agencyId: string): Promise<BillingRows> {
  const db = createServiceClient();
  const [agency, plans, businesses, items] = await Promise.all([
    db
      .from("agencies")
      .select("status, trial_ends_at, current_period_end, stripe_subscription_id, stripe_customer_id")
      .eq("id", agencyId)
      .single(),
    db.from("plans").select("id, name, price_cents, monthly_credits").eq("active", true).not("price_cents", "is", null).order("price_cents"),
    db.from("businesses").select("id, name").eq("agency_id", agencyId).neq("status", "onboarding").order("created_at"),
    db
      .from("business_subscriptions")
      .select("business_id, plan_id, stripe_subscription_item_id")
      .eq("agency_id", agencyId)
      .neq("status", "canceled"),
  ]);
  if (agency.error) throw new Error(`Could not load agency: ${agency.error.message}`);
  if (plans.error) throw new Error(`Could not load plans: ${plans.error.message}`);
  if (businesses.error) throw new Error(`Could not load businesses: ${businesses.error.message}`);
  if (items.error) throw new Error(`Could not load business plans: ${items.error.message}`);

  const itemOf = new Map(items.data.map((i) => [i.business_id, i]));
  return {
    agency: {
      status: agency.data.status,
      trialEndsAt: agency.data.trial_ends_at,
      periodEndsAt: agency.data.current_period_end,
      subscriptionId: agency.data.stripe_subscription_id,
      customerId: agency.data.stripe_customer_id,
    },
    plans: plans.data.map((p) => ({ id: p.id, name: p.name, priceCents: p.price_cents ?? 0, monthlyCredits: p.monthly_credits ?? 0 })),
    businesses: businesses.data.map((b) => ({
      id: b.id,
      name: b.name,
      planId: itemOf.get(b.id)?.plan_id ?? null,
      itemId: itemOf.get(b.id)?.stripe_subscription_item_id ?? null,
    })),
  };
}

/** The agency's own Stripe customer; the portal never takes a customer ID from the browser. */
export async function agencyCustomerId(agencyId: string): Promise<string | null> {
  const { data, error } = await createServiceClient().from("agencies").select("stripe_customer_id").eq("id", agencyId).single();
  if (error) throw new Error(`Could not load agency: ${error.message}`);
  return data.stripe_customer_id;
}
