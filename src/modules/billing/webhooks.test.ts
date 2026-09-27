import type Stripe from "stripe";
import { afterAll, describe, expect, it, vi } from "vitest";
import { processStripeWebhook } from "./webhooks";
import { monthBefore } from "./webhooks/credits";
import * as fx from "./webhooks/fixtures.test-helpers";
import { agencyRow, businessRows, cleanUp, grantCreditsForTest, grants, harness, ledgerTotal, secret, service, setup } from "./webhooks/harness.test-helpers";

// B-42 fixture tests against the local database: every event is delivered twice and must apply once.
// Each delivery makes several database round trips, so tests get more than the 5 second default.
vi.setConfig({ testTimeout: 30_000 });
const DAY = fx.DAY;

afterAll(cleanUp);

describe("signature and replay guard", () => {
  it("rejects a wrong or missing signature", async () => {
    const { payload } = fx.signedPayload(fx.event("invoice.paid", {}), secret);
    const other = fx.signedPayload(JSON.parse(payload), fx.webhookSecret()).signature;
    expect((await processStripeWebhook(payload, other, { secret })).status).toBe(400);
    expect((await processStripeWebhook(payload, null, { secret })).status).toBe(400);
  });

  it("returns 200 for events it does not handle", async () => {
    const h = harness();
    const [first, second] = await h.deliverTwice(fx.event("customer.updated", { id: "cus_x", object: "customer" }));
    expect(first.body).toEqual({ received: true, outcome: "ignored" });
    expect(second.body).toEqual({ received: true, duplicate: true });
  });
});

describe("signup with a trial", () => {
  it("links the agency, syncs each business, grants 100 trial credits once, and emails before the trial ends", async () => {
    const a = await setup();
    const h = harness();
    const trialEnd = fx.nowSeconds() + 7 * DAY;
    const sub = fx.subscription({
      customer: a.customer,
      agencyId: a.agencyId,
      status: "trialing",
      trialEnd,
      items: [
        { product: "cd_plan_starter", businessId: a.businesses[0], periodEnd: trialEnd },
        { product: "cd_plan_pro", businessId: a.businesses[1], periodEnd: trialEnd },
      ],
    });
    h.subscriptions.set(sub.id, sub);

    const session = fx.checkoutSession({ mode: "subscription", customer: a.customer, agencyId: a.agencyId, subscriptionId: sub.id });
    for (const res of await h.deliverTwice(fx.event("checkout.session.completed", session))) expect(res.status).toBe(200);
    for (const res of await h.deliverTwice(fx.event("customer.subscription.created", sub))) expect(res.status).toBe(200);

    expect(await agencyRow(a.agencyId)).toMatchObject({
      status: "trialing",
      stripe_customer_id: a.customer,
      stripe_subscription_id: sub.id,
    });
    expect(Date.parse((await agencyRow(a.agencyId)).trial_ends_at!)).toBe(trialEnd * 1000);
    expect(await businessRows(a.agencyId)).toEqual([
      { business_id: a.businesses[1], plan_id: "pro", status: "trialing", stripe_subscription_item_id: sub.items.data[1].id },
      { business_id: a.businesses[0], plan_id: "starter", status: "trialing", stripe_subscription_item_id: sub.items.data[0].id },
    ]);

    const trialLines = sub.items.data.map((item) =>
      fx.line({ product: item.price.product as string, amount: 0, subscriptionId: sub.id, itemId: item.id, start: fx.nowSeconds(), end: trialEnd }),
    );
    const trialInvoice = fx.invoice({ customer: a.customer, subscriptionId: sub.id, agencyId: a.agencyId, billingReason: "subscription_create", lines: trialLines });
    const results = await h.deliverTwice(fx.event("invoice.paid", trialInvoice));
    expect(results.map((r) => r.body)).toEqual([{ received: true, outcome: "handled" }, { received: true, duplicate: true }]);
    // A new event for the same invoice (not a retry) still cannot grant twice: the line ID is the ledger key.
    await h.deliver(fx.event("invoice.paid", trialInvoice));

    const trialGrants = await grants(a.agencyId);
    expect(trialGrants).toMatchObject([{ source: "trial", source_id: trialLines[0].id, amount: 100, remaining: 100 }]);
    expect(Date.parse(trialGrants[0].expires_at!)).toBe(trialEnd * 1000);
    expect(await ledgerTotal(a.agencyId)).toBe(100);

    await h.deliverTwice(fx.event("customer.subscription.trial_will_end", sub));
    expect(h.emails.map((e) => [e.type, e.to, e.idempotencyKey])).toEqual([
      ["trial_ending", a.email, `trial_ending:${sub.id}:${trialEnd * 1000}`],
    ]);
  });
});

describe("trial ends and the card is charged", () => {
  it("grants each business its plan credits once and sets the agency active", async () => {
    const a = await setup();
    const h = harness();
    const start = fx.nowSeconds();
    const end = start + 30 * DAY;
    const sub = fx.subscription({
      customer: a.customer,
      agencyId: a.agencyId,
      status: "active",
      items: [
        { product: "cd_plan_starter", businessId: a.businesses[0], periodEnd: end },
        { product: "cd_plan_pro", businessId: a.businesses[1], periodEnd: end },
      ],
    });
    h.subscriptions.set(sub.id, sub);
    await service.from("agencies").update({ stripe_customer_id: a.customer }).eq("id", a.agencyId).throwOnError();

    const lines = [
      fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: sub.id, itemId: sub.items.data[0].id, start, end }),
      fx.line({ product: "cd_plan_pro", amount: 24900, subscriptionId: sub.id, itemId: sub.items.data[1].id, start, end }),
    ];
    // No agency_id in metadata: found by the linked Stripe customer.
    const paid = fx.invoice({ customer: a.customer, subscriptionId: sub.id, billingReason: "subscription_cycle", lines });
    for (const res of await h.deliverTwice(fx.event("invoice.paid", paid))) expect(res.status).toBe(200);
    await h.deliverTwice(fx.event("customer.subscription.updated", sub));

    expect((await grants(a.agencyId)).map((g) => [g.source, g.source_id, g.amount])).toEqual([
      ["plan", lines[0].id, 1200],
      ["plan", lines[1].id, 2500],
    ]);
    expect(await ledgerTotal(a.agencyId)).toBe(3700);
    expect((await agencyRow(a.agencyId)).status).toBe("active");
    expect((await businessRows(a.agencyId)).map((r) => r.status)).toEqual(["active", "active"]);
  });

  it("grants +650 once for an upgrade paid mid-period", async () => {
    const a = await setup("active");
    const h = harness();
    const end = fx.nowSeconds() + 15 * DAY;
    const start = end - 15 * DAY;
    const subId = fx.id("sub");
    const half = { subscriptionId: subId, itemId: fx.id("si"), proration: true, start, end };
    const lines = [fx.line({ ...half, product: "cd_plan_starter", amount: -7450 }), fx.line({ ...half, product: "cd_plan_pro", amount: 12450 })];
    const upgrade = fx.invoice({ customer: a.customer, subscriptionId: subId, agencyId: a.agencyId, billingReason: "subscription_update", lines });
    await h.deliverTwice(fx.event("invoice.paid", upgrade));
    const [grant] = await grants(a.agencyId);
    const month = end - monthBefore(new Date(end * 1000)).getTime() / 1000;
    expect(grant).toMatchObject({ source: "plan", source_id: lines[1].id, amount: Math.round(1300 * (15 * DAY) / month) });
    expect(await grants(a.agencyId)).toHaveLength(1);
  });
});

describe("failed payment", () => {
  it("marks the agency past_due, pauses scheduled scans and sends one email per invoice", async () => {
    const a = await setup("active");
    const h = harness();
    const subId = fx.id("sub");
    await service.from("business_subscriptions").insert(
      a.businesses.map((businessId) => ({ business_id: businessId, agency_id: a.agencyId, plan_id: "starter", status: "active" })),
    ).throwOnError();
    const lines = [fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start: fx.nowSeconds(), end: fx.nowSeconds() + 30 * DAY })];
    const failed = fx.invoice({ customer: a.customer, subscriptionId: subId, agencyId: a.agencyId, billingReason: "subscription_cycle", lines, status: "open" });

    for (const res of await h.deliverTwice(fx.event("invoice.payment_failed", failed))) expect(res.status).toBe(200);
    // Stripe's next retry fails too: a new event for the same invoice.
    await h.deliver(fx.event("invoice.payment_failed", failed));

    expect((await agencyRow(a.agencyId)).status).toBe("past_due");
    expect((await businessRows(a.agencyId)).map((r) => r.status)).toEqual(["past_due", "past_due"]);
    expect(await grants(a.agencyId)).toEqual([]);
    expect(h.emails).toHaveLength(2);
    expect(new Set(h.emails.map((e) => e.idempotencyKey))).toEqual(new Set([`payment_failed:${failed.id}`]));

    // The businesses are due now and the agency has credits, but a past_due agency is never queued.
    await grantCreditsForTest(a.agencyId);
    await service.rpc("enqueue_due_scans", { p_include_real: false }).throwOnError();
    const { data: jobs } = await service.from("scan_jobs").select("id").in("business_id", a.businesses).throwOnError();
    expect(jobs).toEqual([]);
  });

  it("never overwrites an admin suspension", async () => {
    const a = await setup("suspended");
    const h = harness();
    const subId = fx.id("sub");
    const lines = [fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start: fx.nowSeconds(), end: fx.nowSeconds() + 30 * DAY })];
    await h.deliver(fx.event("invoice.payment_failed", fx.invoice({ customer: a.customer, subscriptionId: subId, agencyId: a.agencyId, billingReason: "subscription_cycle", lines, status: "open" })));
    expect((await agencyRow(a.agencyId)).status).toBe("suspended");
  });
});

describe("plan changes and cancel", () => {
  it("cancels and unschedules a removed business, then cancels everything when the subscription ends", async () => {
    const a = await setup("active");
    const h = harness();
    const end = fx.nowSeconds() + 20 * DAY;
    const both = fx.subscription({
      customer: a.customer,
      agencyId: a.agencyId,
      status: "active",
      items: [
        { product: "cd_plan_starter", businessId: a.businesses[0], periodEnd: end },
        { product: "cd_plan_starter", businessId: a.businesses[1], periodEnd: end },
      ],
    });
    h.subscriptions.set(both.id, both);
    await h.deliverTwice(fx.event("customer.subscription.updated", both));

    const one = { ...both, items: { ...both.items, data: [both.items.data[0]] } } as Stripe.Subscription;
    h.subscriptions.set(both.id, one);
    await h.deliverTwice(fx.event("customer.subscription.updated", one));

    const rows = await businessRows(a.agencyId);
    expect(rows.find((r) => r.business_id === a.businesses[1])?.status).toBe("canceled");
    expect(rows.find((r) => r.business_id === a.businesses[0])?.status).toBe("active");
    const { data: removed } = await service.from("businesses").select("next_scan_at").eq("id", a.businesses[1]).single().throwOnError();
    expect(removed.next_scan_at).toBeNull();

    await h.deliverTwice(fx.event("customer.subscription.deleted", { ...one, status: "canceled" }));
    expect((await agencyRow(a.agencyId)).status).toBe("canceled");
    expect((await businessRows(a.agencyId)).map((r) => r.status)).toEqual(["canceled", "canceled"]);
  });

  it("reads the current subscription, so an older event arriving late cannot undo a newer state", async () => {
    const a = await setup("trialing");
    const h = harness();
    const end = fx.nowSeconds() + 30 * DAY;
    const items = [{ product: "cd_plan_pro", businessId: a.businesses[0], periodEnd: end }];
    const current = fx.subscription({ customer: a.customer, agencyId: a.agencyId, status: "active", items });
    const stale = { ...current, status: "trialing" } as Stripe.Subscription;
    h.subscriptions.set(current.id, current);
    await h.deliver(fx.event("customer.subscription.created", stale));
    expect((await agencyRow(a.agencyId)).status).toBe("active");
  });
});

describe("top-ups", () => {
  it("grants the pack's credits once, never expiring, only when paid", async () => {
    const a = await setup("active");
    const h = harness();
    const unpaid = fx.checkoutSession({ mode: "payment", customer: a.customer, agencyId: a.agencyId, paymentStatus: "unpaid", metadata: { kind: "topup", topup_pack_id: "topup_500" } });
    await h.deliverTwice(fx.event("checkout.session.completed", unpaid));
    expect(await grants(a.agencyId)).toEqual([]);

    const paidLater = { ...unpaid, payment_status: "paid" };
    await h.deliverTwice(fx.event("checkout.session.async_payment_succeeded", paidLater));
    await h.deliverTwice(fx.event("checkout.session.completed", paidLater));
    expect(await grants(a.agencyId)).toEqual([{ source: "topup", source_id: unpaid.id, amount: 500, remaining: 500, expires_at: null }]);
  });
});

describe("failures are retried", () => {
  it("returns 500 for an unknown customer and processes the retry once the agency is linked", async () => {
    const a = await setup("active");
    const h = harness();
    const subId = fx.id("sub");
    const lines = [fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start: fx.nowSeconds(), end: fx.nowSeconds() + 30 * DAY })];
    const paid = fx.event("invoice.paid", fx.invoice({ customer: a.customer, subscriptionId: subId, billingReason: "subscription_cycle", lines }));

    expect((await h.deliver(paid)).status).toBe(500);
    await service.from("agencies").update({ stripe_customer_id: a.customer }).eq("id", a.agencyId).throwOnError();
    expect((await h.deliver(paid)).body).toEqual({ received: true, outcome: "handled" });
    expect((await h.deliver(paid)).body).toEqual({ received: true, duplicate: true });
    expect(await ledgerTotal(a.agencyId)).toBe(1200);
  });
});
