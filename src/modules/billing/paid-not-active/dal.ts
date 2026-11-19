import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { topupFixtures } from "../topup/client";
import { getStripe, isStripeConfigured } from "../stripe";
import { PAID_NOT_ACTIVE_KIND, paidNotActive, paidNotActiveMessage } from "./service";

// Run with the admin alert checks every 15 minutes (MVP_SPEC 22). Stripe can't be asked from pg_cron, so this check
// lives in the app: each agency on a trial here is compared with its subscription in Stripe.

const MAX_AGENCIES = 100;

/** Raises the paid_not_active alert when any agency is stuck; returns the agencies found. */
export async function checkPaidNotActive(now = new Date()): Promise<string[]> {
  if (!isStripeConfigured() || topupFixtures()) return [];
  const db = createServiceClient();
  const { data, error } = await db
    .from("agencies")
    .select("id, name, stripe_subscription_id")
    .eq("status", "trialing")
    .not("stripe_subscription_id", "is", null)
    .limit(MAX_AGENCIES);
  if (error) throw new Error(`Could not load trialing agencies: ${error.message}`);

  const stuck: string[] = [];
  for (const agency of data) {
    try {
      const sub = await getStripe().subscriptions.retrieve(agency.stripe_subscription_id!);
      if (paidNotActive(sub, now)) stuck.push(agency.name);
    } catch (e) {
      // One subscription Stripe can't find (a deleted sandbox one) never stops the others being checked.
      console.warn("[billing/paid-not-active] could not read", agency.stripe_subscription_id, e instanceof Error ? e.message : String(e));
    }
  }
  if (stuck.length === 0) return [];
  const { error: raiseError } = await db.rpc("raise_system_alert", {
    p_kind: PAID_NOT_ACTIVE_KIND,
    p_severity: "critical",
    p_message: paidNotActiveMessage(stuck),
    p_details: { agencies: stuck },
  });
  if (raiseError) console.error(`Could not raise the ${PAID_NOT_ACTIVE_KIND} alert: ${raiseError.message}`);
  return stuck;
}
