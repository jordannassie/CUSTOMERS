import { afterAll, describe, expect, it } from "vitest";
import * as fx from "./fixtures.test-helpers";
import { agencyRow, businessRows, cleanUp, harness, service, setup } from "./harness.test-helpers";

// BUG-106: with no email settings the payment failed and trial ending events returned 500, so Stripe kept retrying
// events whose billing change was already saved.
afterAll(cleanUp);

const notConfigured = async () => {
  throw new Error("Email is not configured. Set EMAIL_FROM.");
};

describe("events that send an email, with email not set up", () => {
  it("still saves a failed payment and answers 200", async () => {
    const a = await setup("active");
    const h = harness(notConfigured);
    const subId = fx.id("sub");
    h.subscriptions.set(subId, fx.subscription({ id: subId, customer: a.customer, agencyId: a.agencyId, status: "past_due", items: [{ product: "cd_plan_starter", periodEnd: fx.nowSeconds() + 30 * fx.DAY }] }));
    await service.from("business_subscriptions").insert(
      a.businesses.map((businessId) => ({ business_id: businessId, agency_id: a.agencyId, plan_id: "starter", status: "active" })),
    ).throwOnError();
    const lines = [fx.line({ product: "cd_plan_starter", amount: 14900, subscriptionId: subId, start: fx.nowSeconds(), end: fx.nowSeconds() + 30 * fx.DAY })];
    const failed = fx.invoice({ customer: a.customer, subscriptionId: subId, agencyId: a.agencyId, billingReason: "subscription_cycle", lines, status: "open" });

    expect((await h.deliver(fx.event("invoice.payment_failed", failed))).status).toBe(200);
    expect((await agencyRow(a.agencyId)).status).toBe("past_due");
    expect((await businessRows(a.agencyId)).map((r) => r.status)).toEqual(["past_due", "past_due"]);
  });

  it("answers 200 for a trial ending", async () => {
    const a = await setup();
    const h = harness(notConfigured);
    const trialEnd = fx.nowSeconds() + 3 * fx.DAY;
    const sub = fx.subscription({ customer: a.customer, agencyId: a.agencyId, status: "trialing", trialEnd, items: [{ product: "cd_plan_starter", periodEnd: trialEnd }] });
    expect((await h.deliver(fx.event("customer.subscription.trial_will_end", sub))).status).toBe(200);
  });
});
