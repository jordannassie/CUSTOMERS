import type { ActionResult } from "@/modules/auth";
import type { PlanChangeStripe } from "../plan-change/client";
import { scheduleIdOf, type PlanChangeContext } from "../plan-change/planner";
import type { BillingRows } from "./dal";
import type { PortalClient } from "./access";
import { buildBillingView, type BillingView } from "./summary";

// The billing page's reads and the customer portal (B-46). Stripe and the database come in as deps, so tests
// run with fakes and no Stripe calls.

export type BillingPageDeps = {
  rows: BillingRows;
  /** Null when Stripe is not set up here. */
  access: { context: PlanChangeContext; stripe: PlanChangeStripe } | null;
};

export async function billingView({ rows, access }: BillingPageDeps): Promise<BillingView> {
  const subscriptionId = rows.agency.subscriptionId;
  if (!subscriptionId) return buildBillingView(rows, "none");
  if (!access) return buildBillingView(rows, "unavailable");
  try {
    const { stripe, context } = access;
    const sub = await stripe.retrieveSubscription(subscriptionId);
    const scheduleId = scheduleIdOf(sub);
    const found = scheduleId ? await stripe.retrieveSchedule(scheduleId) : null;
    const schedule = found?.status === "active" ? found : null;
    // A plan set to end has no next bill, and Stripe refuses to preview one.
    const upcoming =
      sub.cancel_at_period_end || sub.status === "canceled"
        ? null
        : await stripe.previewInvoice(schedule ? { schedule: schedule.id } : { subscription: sub.id });
    const planOfPrice = new Map(context.plans.flatMap((p) => (p.stripePriceId ? [[p.stripePriceId, p.id] as const] : [])));
    return buildBillingView(rows, { sub, schedule, upcoming, planOfPrice });
  } catch (error) {
    const e = error as { type?: string; message?: string };
    console.error("[billing/account] could not load the subscription", e?.type ?? e?.message);
    return buildBillingView(rows, "error");
  }
}

export type PortalDeps = { client: PortalClient | null; customerId: string | null; returnUrl: string };

export async function portalUrl({ client, customerId, returnUrl }: PortalDeps): Promise<ActionResult<{ url: string }>> {
  if (!client) {
    return { ok: false, status: 503, error: "Card and invoice settings aren't available right now. Contact us and we'll help." };
  }
  if (!customerId) {
    return { ok: false, status: 404, error: "There's no card on file yet. You add one when you start your plan." };
  }
  try {
    return { ok: true, data: { url: await client.createSession(customerId, returnUrl) } };
  } catch (error) {
    const e = error as { type?: string; statusCode?: number };
    console.error("[billing/account] portal session failed", e?.type, e?.statusCode);
    return { ok: false, status: 502, error: "We couldn't open your card and invoice settings. Try again in a minute." };
  }
}
