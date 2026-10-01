import { afterAll, describe, expect, it } from "vitest";
import { canAddBusiness, canSpendTopUps, canStartScan, REASONS } from "@/modules/entitlements";
import { trialAllowed } from "./checkout";
import { FakeStripe } from "./plan-change/fake-stripe";
import { monthAfter } from "./plan-change/fake-stripe-objects";
import type { PlanChangeContext } from "./plan-change/planner";
import { applyPlanChange, previewPlanChange } from "./plan-change/service";
import * as fx from "./webhooks/fixtures.test-helpers";
import { agencyRow, businessRows, cleanUp, grants, harness, service, setup } from "./webhooks/harness.test-helpers";
import { TRIAL_CREDITS } from "./webhooks/credits";

// B-45 (MVP_SPEC 4.4, D-16, D-17, F-43) on the local database. The in-memory Stripe and its clock stand in for a
// Stripe test clock; every change reaches the database only through the real webhook handlers.

const DAY = fx.DAY;

afterAll(cleanUp);

/** A 7-day trial on one business, started now, with its $0 first invoice paid. */
async function startTrial() {
  const a = await setup();
  const h = harness();
  const start = fx.nowSeconds();
  const trialEnd = start + 7 * DAY;
  const stripe = new FakeStripe({
    now: start,
    status: "trialing",
    periodStart: start,
    periodEnd: trialEnd,
    items: [{ businessId: a.businesses[0], price: "price_starter" }],
    ids: { subscription: fx.id("sub"), customer: a.customer, agency: a.agencyId },
  });
  let sent = 0;
  /** What Stripe would send now: the subscription's state, then each invoice paid since the last call. */
  const sendEvents = async (type: "customer.subscription.created" | "customer.subscription.updated" | "customer.subscription.deleted") => {
    h.subscriptions.set(stripe.subscriptionId, stripe.subscription());
    expect((await h.deliver(fx.event(type, stripe.subscription()))).status).toBe(200);
    for (const invoice of stripe.invoices.slice(sent)) {
      expect((await h.deliver(fx.event("invoice.paid", invoice))).status).toBe(200);
    }
    sent = stripe.invoices.length;
  };

  const session = fx.checkoutSession({ mode: "subscription", customer: a.customer, agencyId: a.agencyId, subscriptionId: stripe.subscriptionId });
  await h.deliver(fx.event("checkout.session.completed", session));
  await sendEvents("customer.subscription.created");
  const trialLine = fx.line({ product: "cd_plan_starter", amount: 0, subscriptionId: stripe.subscriptionId, start, end: trialEnd });
  const trialInvoice = fx.invoice({ customer: a.customer, subscriptionId: stripe.subscriptionId, billingReason: "subscription_create", lines: [trialLine] });
  await h.deliver(fx.event("invoice.paid", trialInvoice));
  return { a, h, stripe, trialEnd, sendEvents };
}

const trialGrant = (trialEnd: number) => ({ source: "trial", amount: TRIAL_CREDITS, expires_at: new Date(trialEnd * 1000).toISOString() });

async function agencyState(agencyId: string) {
  const row = await agencyRow(agencyId);
  const { data } = await service.from("agencies").select("cancel_at").eq("id", agencyId).single().throwOnError();
  return { status: row.status, cancelAt: data.cancel_at === null ? null : Date.parse(data.cancel_at) };
}

/** What the grant rows look like once read back, times normalised. */
async function grantRows(agencyId: string) {
  return (await grants(agencyId)).map((g) => ({ source: g.source, amount: g.amount, expires_at: g.expires_at && new Date(g.expires_at).toISOString() }));
}

describe("trial", () => {
  it("grants the trial credits once, expiring when the trial ends", async () => {
    const { a, trialEnd } = await startTrial();
    expect(await grantRows(a.agencyId)).toEqual([trialGrant(trialEnd)]);
    expect(await agencyState(a.agencyId)).toEqual({ status: "trialing", cancelAt: null });
  });

  it("converts on day 7: one charge for the plan, plan credits, and no second trial grant", async () => {
    const { a, stripe, trialEnd, sendEvents } = await startTrial();
    stripe.advanceTo(trialEnd + 3600);
    await sendEvents("customer.subscription.updated");

    expect(stripe.invoices.map((i) => [i.billing_reason, i.amount_paid])).toEqual([["subscription_cycle", 14900]]);
    expect(await agencyState(a.agencyId)).toEqual({ status: "active", cancelAt: null });
    expect(await grantRows(a.agencyId)).toEqual([
      trialGrant(trialEnd),
      { source: "plan", amount: 1200, expires_at: new Date(monthAfter(trialEnd) * 1000).toISOString() },
    ]);
  });

  it("cancelled during the trial: nothing is charged and the account is read only from the trial end", async () => {
    const { a, h, stripe, trialEnd, sendEvents } = await startTrial();
    const ctx: PlanChangeContext = {
      agencyId: a.agencyId,
      agencyStatus: "trialing",
      subscriptionId: stripe.subscriptionId,
      plans: [{ id: "starter", name: "Starter", priceCents: 14900, stripePriceId: "price_starter" }],
      businesses: [{ id: a.businesses[0], name: "Bean There Coffee", planId: "starter", itemId: stripe.items[0].id }],
    };
    const deps = { stripe, plansByProduct: new Map([["cd_plan_starter", { planId: "starter", monthlyCredits: 1200 }]]), now: () => new Date(stripe.clock * 1000) };
    const preview = await previewPlanChange(ctx, { kind: "cancel" }, deps);
    expect(preview.details).toContain("Your card won't be charged.");
    await applyPlanChange(ctx, { kind: "cancel" }, preview.previewedAt, deps);
    await sendEvents("customer.subscription.updated");

    // Still a trial until its end, with the date the banner shows.
    expect(await agencyState(a.agencyId)).toEqual({ status: "trialing", cancelAt: trialEnd * 1000 });
    expect(await canStartScan(a.agencyId, a.businesses[0])).toEqual({ allowed: true, reason: REASONS.ok });

    // Stripe still sends the 3-day reminder; its "we'll charge" email must not go out.
    await h.deliver(fx.event("customer.subscription.trial_will_end", stripe.subscription()));
    expect(h.emails).toEqual([]);

    stripe.advanceTo(trialEnd + 3600);
    await sendEvents("customer.subscription.deleted");

    expect(stripe.invoices).toEqual([]);
    expect(await agencyState(a.agencyId)).toEqual({ status: "canceled", cancelAt: null });
    expect((await businessRows(a.agencyId)).map((b) => b.status)).toEqual(["canceled"]);
    expect(await grantRows(a.agencyId)).toEqual([trialGrant(trialEnd)]);
    for (const check of [canStartScan(a.agencyId, a.businesses[0]), canAddBusiness(a.agencyId), canSpendTopUps(a.agencyId)]) {
      expect(await check).toEqual({ allowed: false, reason: REASONS.canceled });
    }
  });

  it("gives an agency one trial: a later trial start grants no credits and the card step refuses it", async () => {
    const { a, h, trialEnd } = await startTrial();
    const sub = fx.id("sub");
    const line = fx.line({ product: "cd_plan_starter", amount: 0, subscriptionId: sub, start: fx.nowSeconds(), end: fx.nowSeconds() + 7 * DAY });
    const again = fx.invoice({ customer: a.customer, subscriptionId: sub, agencyId: a.agencyId, billingReason: "subscription_create", lines: [line] });
    expect((await h.deliver(fx.event("invoice.paid", again))).status).toBe(200);

    expect(await grantRows(a.agencyId)).toEqual([trialGrant(trialEnd)]);
    const row = await agencyRow(a.agencyId);
    expect(trialAllowed({ stripeCustomerId: row.stripe_customer_id, stripeSubscriptionId: row.stripe_subscription_id })).toBe(false);
    expect(trialAllowed({ stripeCustomerId: null, stripeSubscriptionId: null })).toBe(true);
  });
});
