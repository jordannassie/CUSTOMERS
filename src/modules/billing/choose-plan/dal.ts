import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { listPlanPrices } from "../dal";
import { checkoutFixtures } from "../checkout-client";
import { getStripe, isStripeConfigured } from "../stripe";
import { isMissingInStripe, isOtherStripeMode } from "../stripe-missing";
import type { ChoosePlanRows } from "./service";

// Reads for the Choose plan page (BUG-079), as the service role. Callers pass the agency from requireAgency(), so
// every query is scoped to it.

export async function loadChoosePlanAgency(agencyId: string): Promise<ChoosePlanRows["agency"]> {
  const { data, error } = await createServiceClient()
    .from("agencies")
    .select("status, stripe_customer_id, stripe_subscription_id")
    .eq("id", agencyId)
    .single();
  if (error) throw new Error(`Could not load agency: ${error.message}`);
  return { status: data.status, customerId: data.stripe_customer_id, subscriptionId: data.stripe_subscription_id };
}

export async function loadChoosePlanRows(agencyId: string): Promise<ChoosePlanRows> {
  const db = createServiceClient();
  const [agency, businesses, plans] = await Promise.all([
    loadChoosePlanAgency(agencyId),
    db
      .from("businesses")
      .select("id, name")
      .eq("agency_id", agencyId)
      .neq("status", "onboarding")
      .is("deleted_at", null)
      .order("created_at"),
    listPlanPrices(db),
  ]);
  if (businesses.error) throw new Error(`Could not load businesses: ${businesses.error.message}`);
  return { agency, businesses: businesses.data, plans };
}

/**
 * Whether the agency's saved subscription still exists in Stripe. "missing" only when Stripe says it has no such
 * subscription in this mode; a plan in the other mode (live seen with test keys, D-43) is "other_mode" and is never
 * ended from here. Throws when Stripe cannot be reached. QA 2026-11-01: an agency whose subscription was gone from
 * Stripe had no way to pay.
 */
// Fixture mode (e2e) never calls Stripe.
const liveStripe = () => isStripeConfigured() && !checkoutFixtures();

export async function savedPlanInStripe(subscriptionId: string): Promise<"present" | "missing" | "other_mode"> {
  if (!liveStripe()) return "present";
  try {
    await getStripe().subscriptions.retrieve(subscriptionId);
    return "present";
  } catch (error) {
    if (!isMissingInStripe(error)) throw error;
    return isOtherStripeMode(error) ? "other_mode" : "missing";
  }
}

/** The saved customer when Stripe still has it in this mode, else null so checkout makes a new one from the email. */
export async function usableCustomerId(customerId: string | null): Promise<string | null> {
  if (!customerId || !liveStripe()) return customerId;
  try {
    const customer = await getStripe().customers.retrieve(customerId);
    return customer.deleted ? null : customerId;
  } catch (error) {
    if (isMissingInStripe(error) && !isOtherStripeMode(error)) return null;
    throw error;
  }
}

/**
 * Ends a plan Stripe no longer has, the way the webhook ends a cancelled one (status canceled, business items
 * canceled), so a new checkout can link its subscription. Only for that exact subscription and only from a live
 * status, so a second call or a newer plan is left alone. Keeps both Stripe ids: no second free trial (F-43). Never
 * touches credits.
 */
export async function releaseMissingPlan(agencyId: string, subscriptionId: string): Promise<void> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("agencies")
    .update({ status: "canceled", cancel_at: null })
    .eq("id", agencyId)
    .eq("stripe_subscription_id", subscriptionId)
    .not("status", "in", "(canceled,suspended,deleted)")
    .select("id");
  if (error) throw new Error(`Could not end the missing plan: ${error.message}`);
  if (!data.length) return;
  const items = await db.from("business_subscriptions").update({ status: "canceled" }).eq("agency_id", agencyId).neq("status", "canceled");
  if (items.error) throw new Error(`Could not end the missing plan's businesses: ${items.error.message}`);
  console.warn("[billing/choose-plan] ended a plan Stripe no longer has:", agencyId, subscriptionId);
}
