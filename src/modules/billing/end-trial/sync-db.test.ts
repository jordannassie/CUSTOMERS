import type Stripe from "stripe";
import { afterAll, describe, expect, it } from "vitest";
import { endTrialGrant, getBalance, grantTrialCredits } from "@/modules/credits";
import { FakeStripe } from "../plan-change/fake-stripe";
import type { PlanChangeContext } from "../plan-change/planner";
import { plansByProduct } from "../plan-change/scenario.test-helpers";
import * as fx from "../webhooks/fixtures.test-helpers";
import { agencyRow, cleanUp, grants, harness, service, setup } from "../webhooks/harness.test-helpers";
import { syncFromStripe } from "../webhooks/sync";
import { DECLINED, endTrialNow, type EndTrialDeps } from "./service";

// 2026-10-15 (A1): "Start my plan now" no longer waits only for invoice.paid. After Stripe ends the trial, the
// subscription and its paid invoice are read back and applied with the webhook's own handlers, on the local database.
afterAll(cleanUp);

const DAY = 86_400;
const ATTEMPT = "00000000-0000-4000-8000-0000000000b1";

/** A trialing agency with 2 Starter businesses, linked to an in-memory Stripe subscription; no webhook ever comes. */
async function trialAgency() {
  const a = await setup("trialing");
  const now = Math.floor(Date.now() / 1000);
  const subscriptionId = fx.id("sub");
  const stripe = new FakeStripe({
    now,
    status: "trialing",
    periodStart: now - 2 * DAY,
    periodEnd: now + 5 * DAY,
    ids: { subscription: subscriptionId, customer: a.customer, agency: a.agencyId },
    items: a.businesses.map((businessId) => ({ businessId, price: "price_starter" })),
  });
  await service.from("agencies").update({ stripe_customer_id: a.customer, stripe_subscription_id: subscriptionId }).eq("id", a.agencyId).throwOnError();

  const h = harness();
  // What Stripe returns for the subscription and its invoices, from the in-memory one.
  h.deps.stripe.retrieveSubscription = async () => ({ ...stripe.subscription(), latest_invoice: stripe.invoices.at(-1)?.id ?? null }) as Stripe.Subscription;
  h.deps.stripe.retrieveInvoice = async (id) => stripe.invoices.find((i) => i.id === id)!;

  const ctx: PlanChangeContext = {
    agencyId: a.agencyId,
    agencyStatus: "trialing",
    subscriptionId,
    plans: [
      { id: "starter", name: "Starter", priceCents: 14900, stripePriceId: "price_starter" },
      { id: "pro", name: "Pro", priceCents: 24900, stripePriceId: "price_pro" },
    ],
    businesses: a.businesses.map((id, i) => ({ id, name: `Business ${i + 1}`, planId: "starter", itemId: `si_${id}` })),
  };
  const deps: EndTrialDeps = { stripe, plansByProduct, now: () => new Date(), sync: (id) => syncFromStripe(h.deps, id) };
  return { a, h, stripe, ctx, deps };
}

const planGrants = async (agencyId: string) => (await grants(agencyId)).filter((g) => g.source === "plan");
const trialEnds = (stripe: FakeStripe) =>
  stripe.calls.filter((c) => c.method === "updateSubscription" && (c.params as { trial_end?: string }).trial_end === "now");

describe("trial credits when the trial ends early (2026-10-16)", () => {
  it("are replaced by the plan credits, once, and a late webhook changes nothing", async () => {
    const { a, h, stripe, ctx, deps } = await trialAgency();
    const trialEnd = new Date((stripe.subscription().trial_end ?? 0) * 1000);
    await grantTrialCredits({ agencyId: a.agencyId, sourceId: fx.id("in"), amount: 150, expiresAt: trialEnd });
    expect((await getBalance(a.agencyId)).balance).toBe(150);

    await endTrialNow(ctx, ATTEMPT, deps);
    const trial = (await grants(a.agencyId)).find((g) => g.source === "trial")!;
    expect(trial.remaining).toBe(0);
    expect(Date.parse(trial.expires_at!)).toBeLessThanOrEqual(Date.now());
    expect((await getBalance(a.agencyId)).balance).toBe(2400);

    for (const res of await h.deliverTwice(fx.event("customer.subscription.updated", stripe.subscription()))) expect(res.status).toBe(200);
    for (const res of await h.deliverTwice(fx.event("invoice.paid", stripe.invoices[0]))) expect(res.status).toBe(200);
    expect((await getBalance(a.agencyId)).balance).toBe(2400);
    const { data: expiries } = await service.from("credit_transactions").select("delta").eq("agency_id", a.agencyId).eq("kind", "expire").throwOnError();
    expect(expiries).toEqual([{ delta: -150 }]);
  });

  it("are kept while the trial runs, and an extended trial is never shortened", async () => {
    const { a, stripe, deps } = await trialAgency();
    const trialEnd = new Date((stripe.subscription().trial_end ?? 0) * 1000);
    await grantTrialCredits({ agencyId: a.agencyId, sourceId: fx.id("in"), amount: 150, expiresAt: trialEnd });
    await deps.sync!(stripe.subscriptionId);
    expect((await getBalance(a.agencyId)).balance).toBe(150);
    expect(await endTrialGrant(a.agencyId, new Date(trialEnd.getTime() + 86_400_000))).toBe(0);
    expect((await getBalance(a.agencyId)).balance).toBe(150);
  });
});

describe("start my plan now without the webhook", () => {
  it("is active with the month's credits at once, granted once", async () => {
    const { a, stripe, ctx, deps } = await trialAgency();
    expect(await endTrialNow(ctx, ATTEMPT, deps)).toEqual({ alreadyActive: false, started: true });

    expect((await agencyRow(a.agencyId)).status).toBe("active");
    expect((await planGrants(a.agencyId)).map((g) => g.amount)).toEqual([1200, 1200]);
    expect((await getBalance(a.agencyId)).balance).toBe(2400);
    expect(stripe.invoices).toHaveLength(1);

    // The page's status check syncs again: nothing more.
    await deps.sync!(ctx.subscriptionId!);
    expect((await getBalance(a.agencyId)).balance).toBe(2400);
  });

  it("grants nothing more when the webhooks arrive late", async () => {
    const { a, h, stripe, ctx, deps } = await trialAgency();
    await endTrialNow(ctx, ATTEMPT, deps);
    const paid = stripe.invoices[0];
    for (const res of await h.deliverTwice(fx.event("invoice.paid", { ...paid, id: paid.id }))) expect(res.status).toBe(200);
    for (const res of await h.deliverTwice(fx.event("customer.subscription.updated", stripe.subscription()))) expect(res.status).toBe(200);
    expect((await planGrants(a.agencyId))).toHaveLength(2);
    expect((await getBalance(a.agencyId)).balance).toBe(2400);
  });

  it("a double click asks Stripe once and charges once; a later click only syncs", async () => {
    const { a, stripe, ctx, deps } = await trialAgency();
    const [first, second] = await Promise.all([endTrialNow(ctx, ATTEMPT, deps), endTrialNow(ctx, ATTEMPT, deps)]);
    expect(first).toEqual(second);
    expect(trialEnds(stripe)).toHaveLength(1);
    expect(stripe.invoices).toHaveLength(1);

    // Stripe already shows the trial ended: no second charge, just the sync.
    expect(await endTrialNow(ctx, "00000000-0000-4000-8000-0000000000b2", deps)).toEqual({ alreadyActive: true, started: true });
    expect(trialEnds(stripe)).toHaveLength(1);
    expect((await getBalance(a.agencyId)).balance).toBe(2400);
  });

  it("a declined card leaves the trial running, with nothing granted", async () => {
    const { a, stripe, ctx, deps } = await trialAgency();
    stripe.declineNextCharge = true;
    await expect(endTrialNow(ctx, ATTEMPT, deps)).rejects.toMatchObject({ type: "StripeCardError", statusCode: 402 });
    expect(stripe.subscription().status).toBe("trialing");
    expect((await agencyRow(a.agencyId)).status).toBe("trialing");
    expect(await planGrants(a.agencyId)).toEqual([]);
    // The action turns the decline into this message, which links to Billing on the page.
    expect(DECLINED).toContain("Billing");
  });
});
