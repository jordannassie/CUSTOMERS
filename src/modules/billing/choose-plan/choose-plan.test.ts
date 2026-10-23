import { describe, expect, it } from "vitest";
import { planSessionParams } from "./params";
import { choosePlanState, hasLivePlan, planStarted, type ChoosePlanRows } from "./service";

const plans: ChoosePlanRows["plans"] = [
  { id: "starter", name: "Starter", priceCents: 14900, monthlyCredits: 1200, maxCompetitors: 5, maxQuestions: 25, stripePriceId: "price_s" },
  { id: "pro", name: "Pro", priceCents: 24900, monthlyCredits: 2500, maxCompetitors: 10, maxQuestions: 25, stripePriceId: "price_p" },
];
const two = [
  { id: "b1", name: "Khaadi" },
  { id: "b2", name: "Cheezious" },
];
const rows = (agency: Partial<ChoosePlanRows["agency"]>, businesses = two): ChoosePlanRows => ({
  agency: { status: "trialing", customerId: null, subscriptionId: null, ...agency },
  businesses,
  plans,
});

describe("choosePlanState (BUG-079, BUG-066)", () => {
  it("offers the trial to an agency that never had a plan", () => {
    expect(choosePlanState(rows({}))).toMatchObject({ kind: "choose", ended: false, trial: true, businessCount: 2 });
  });

  it("starts an ended plan again without a second trial (F-43)", () => {
    const ended = rows({ status: "canceled", customerId: "cus_1", subscriptionId: "sub_old" });
    expect(choosePlanState(ended)).toMatchObject({ kind: "choose", ended: true, trial: false });
  });

  it("sends an agency with a running plan to Billing", () => {
    expect(choosePlanState(rows({ status: "active", customerId: "cus_1", subscriptionId: "sub_1" }))).toEqual({ kind: "has_plan" });
    expect(hasLivePlan({ status: "past_due", customerId: "cus_1", subscriptionId: "sub_1" })).toBe(true);
  });

  it("asks for a business first when there is none", () => {
    expect(choosePlanState(rows({}, []))).toEqual({ kind: "no_business" });
  });

  it("sees the plan as started only once the webhook links a running subscription", () => {
    expect(planStarted({ status: "trialing", customerId: null, subscriptionId: null })).toBe(false);
    expect(planStarted({ status: "canceled", customerId: "cus_1", subscriptionId: "sub_new" })).toBe(false);
    expect(planStarted({ status: "active", customerId: "cus_1", subscriptionId: "sub_new" })).toBe(true);
    expect(planStarted({ status: "trialing", customerId: "cus_1", subscriptionId: "sub_new" })).toBe(true);
  });
});

describe("planSessionParams", () => {
  const price = { currency: "usd" as const, product: "cd_plan_starter", unit_amount: 14900, recurring: { interval: "month" as const } };
  const base = { agencyId: "a1", businessIds: ["b1", "b2"], price, returnUrl: "https://x/plans?session_id={CHECKOUT_SESSION_ID}" };

  it("bills one item per business, each with a price of its own, with the webhook metadata (D-56, BUG-103)", () => {
    const params = planSessionParams({ ...base, customerId: null, email: "o@x.com", trial: true });
    expect(params).toMatchObject({
      mode: "subscription",
      ui_mode: "elements",
      client_reference_id: "a1",
      metadata: { agency_id: "a1", kind: "trial" },
      customer_email: "o@x.com",
      subscription_data: { metadata: { agency_id: "a1" }, trial_period_days: 7 },
    });
    expect(params.line_items).toEqual([
      { price_data: price, quantity: 1, metadata: { business_id: "b1" } },
      { price_data: price, quantity: 1, metadata: { business_id: "b2" } },
    ]);
  });

  it("reuses the Stripe customer and gives no trial on a restart", () => {
    const params = planSessionParams({ ...base, customerId: "cus_1", email: "o@x.com", trial: false });
    expect(params.customer).toBe("cus_1");
    expect(params).not.toHaveProperty("customer_email");
    expect(params.subscription_data).not.toHaveProperty("trial_period_days");
    expect(params.metadata).toEqual({ agency_id: "a1", kind: "plan" });
  });
});
