import { afterAll, describe, expect, it } from "vitest";
import * as fx from "./fixtures.test-helpers";
import { agencyRow, businessRows, cleanUp, grantCreditsForTest, grants, harness, service, setup } from "./harness.test-helpers";

// invoice.payment_failed (B-42, A7): an agency goes past due only while the invoice is unpaid and Stripe agrees.
const DAY = fx.DAY;

afterAll(cleanUp);

describe("failed payment", () => {
  it("marks the agency past_due, pauses scheduled scans and sends one email per invoice", async () => {
    const a = await setup("active");
    const h = harness();
    const subId = fx.id("sub");
    h.subscriptions.set(subId, fx.subscription({ id: subId, customer: a.customer, agencyId: a.agencyId, status: "past_due", items: [{ product: "cd_plan_starter", periodEnd: fx.nowSeconds() + 30 * DAY }] }));
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

  it("ignores a retried failure once the customer paid or fixed the card (A7)", async () => {
    const a = await setup("active");
    const h = harness();
    const subId = fx.id("sub");
    const end = fx.nowSeconds() + 30 * DAY;
    const lines = [fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start: fx.nowSeconds(), end })];
    const open = fx.invoice({ customer: a.customer, subscriptionId: subId, agencyId: a.agencyId, billingReason: "subscription_cycle", lines, status: "open" });
    const paid = fx.invoice({ customer: a.customer, subscriptionId: subId, agencyId: a.agencyId, billingReason: "subscription_cycle", lines, status: "paid" });
    const items = [{ product: "cd_plan_starter", periodEnd: end }];

    // Stripe says the subscription is active again: the old failure changes nothing and sends no email.
    h.subscriptions.set(subId, fx.subscription({ id: subId, customer: a.customer, agencyId: a.agencyId, status: "active", items }));
    expect((await h.deliver(fx.event("invoice.payment_failed", open))).status).toBe(200);
    // The invoice itself was paid: ignored even if the subscription still reads past due.
    h.subscriptions.set(subId, fx.subscription({ id: subId, customer: a.customer, agencyId: a.agencyId, status: "past_due", items }));
    expect((await h.deliver(fx.event("invoice.payment_failed", paid))).status).toBe(200);
    expect((await agencyRow(a.agencyId)).status).toBe("active");
    expect(h.emails).toHaveLength(0);

    // Unpaid is a failed payment too.
    h.subscriptions.set(subId, fx.subscription({ id: subId, customer: a.customer, agencyId: a.agencyId, status: "unpaid", items }));
    await h.deliver(fx.event("invoice.payment_failed", open));
    expect((await agencyRow(a.agencyId)).status).toBe("past_due");
  });

  it("never overwrites an admin suspension", async () => {
    const a = await setup("suspended");
    const h = harness();
    const subId = fx.id("sub");
    h.subscriptions.set(subId, fx.subscription({ id: subId, customer: a.customer, agencyId: a.agencyId, status: "past_due", items: [{ product: "cd_plan_starter", periodEnd: fx.nowSeconds() + 30 * DAY }] }));
    const lines = [fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start: fx.nowSeconds(), end: fx.nowSeconds() + 30 * DAY })];
    await h.deliver(fx.event("invoice.payment_failed", fx.invoice({ customer: a.customer, subscriptionId: subId, agencyId: a.agencyId, billingReason: "subscription_cycle", lines, status: "open" })));
    expect((await agencyRow(a.agencyId)).status).toBe("suspended");
  });
});
