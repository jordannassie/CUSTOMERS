import { describe, expect, it } from "vitest";
import { monthBefore, periodFraction, planInvoiceGrants, TRIAL_CREDITS, type PlanCredits } from "./credits";
import { DAY, invoice, line } from "./fixtures.test-helpers";

const plans = new Map<string, PlanCredits>([
  ["cd_plan_starter", { planId: "starter", monthlyCredits: 1200 }],
  ["cd_plan_pro", { planId: "pro", monthlyCredits: 2500 }],
]);
const now = new Date("2026-09-15T00:00:00Z");
const at = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const sub = "sub_test";
const periodStart = at("2026-09-01T00:00:00Z");
const periodEnd = at("2026-10-01T00:00:00Z");

describe("monthBefore and periodFraction", () => {
  it("clamps the day like Stripe does for months ending on the 31st", () => {
    expect(monthBefore(new Date("2026-03-31T10:00:00Z")).toISOString()).toBe("2026-02-28T10:00:00.000Z");
    expect(monthBefore(new Date("2026-01-15T00:00:00Z")).toISOString()).toBe("2025-12-15T00:00:00.000Z");
  });

  it("is the share of the month left", () => {
    expect(periodFraction({ start: at("2026-09-16T00:00:00Z"), end: periodEnd })).toBe(0.5);
    expect(periodFraction({ start: periodStart, end: periodEnd })).toBe(1);
  });
});

describe("planInvoiceGrants", () => {
  it("grants 100 trial credits once on a $0 first invoice, expiring at trial end, and no plan credits", () => {
    const trialEnd = at("2026-09-22T00:00:00Z");
    const lines = [
      line({ product: "cd_plan_starter", amount: 0, subscriptionId: sub, start: periodStart, end: trialEnd }),
      line({ product: "cd_plan_pro", amount: 0, subscriptionId: sub, start: periodStart, end: trialEnd }),
    ];
    const grants = planInvoiceGrants(invoice({ customer: "cus", subscriptionId: sub, billingReason: "subscription_create", lines }), lines, plans, now);
    expect(grants).toEqual([
      { source: "trial", sourceId: lines[0].id, amount: TRIAL_CREDITS, expiresAt: new Date(trialEnd * 1000), reason: "trial_start" },
    ]);
  });

  it("grants each business line its plan's monthly credits on renewal, keyed by the line ID", () => {
    const lines = [
      line({ product: "cd_plan_starter", amount: 14900, subscriptionId: sub, start: periodStart, end: periodEnd }),
      line({ product: "cd_plan_pro", amount: 49800, quantity: 2, subscriptionId: sub, start: periodStart, end: periodEnd }),
    ];
    const grants = planInvoiceGrants(invoice({ customer: "cus", subscriptionId: sub, billingReason: "subscription_cycle", lines }), lines, plans, now);
    expect(grants.map((g) => [g.sourceId, g.amount, g.source])).toEqual([
      [lines[0].id, 1200, "plan"],
      [lines[1].id, 5000, "plan"],
    ]);
    expect(grants[0].expiresAt).toEqual(new Date(periodEnd * 1000));
  });

  it("grants the prorated difference on an upgrade: Starter to Pro with 15 of 30 days left is +650", () => {
    const itemId = "si_upgrade";
    const half = { subscriptionId: sub, itemId, proration: true, start: at("2026-09-16T00:00:00Z"), end: periodEnd };
    const lines = [
      line({ ...half, product: "cd_plan_starter", amount: -7450 }),
      line({ ...half, product: "cd_plan_pro", amount: 12450 }),
    ];
    const grants = planInvoiceGrants(invoice({ customer: "cus", subscriptionId: sub, billingReason: "subscription_update", lines }), lines, plans, now);
    expect(grants).toEqual([
      { source: "plan", sourceId: lines[1].id, amount: 650, expiresAt: new Date(periodEnd * 1000), reason: "proration" },
    ]);
  });

  it("grants prorated credits for a business added mid-period", () => {
    const lines = [
      line({ product: "cd_plan_starter", amount: 4967, proration: true, subscriptionId: sub, start: at("2026-09-21T00:00:00Z"), end: periodEnd }),
    ];
    const grants = planInvoiceGrants(invoice({ customer: "cus", subscriptionId: sub, billingReason: "subscription_update", lines }), lines, plans, now);
    expect(grants.map((g) => g.amount)).toEqual([400]);
  });

  it("never grants a negative amount for a proration that is only a credit", () => {
    const lines = [
      line({ product: "cd_plan_pro", amount: -12450, proration: true, subscriptionId: sub, start: at("2026-09-16T00:00:00Z"), end: periodEnd }),
    ];
    expect(planInvoiceGrants(invoice({ customer: "cus", subscriptionId: sub, billingReason: "subscription_update", lines }), lines, plans, now)).toEqual([]);
  });

  it("leaves out grants that would already be expired (a very late replay)", () => {
    const lines = [line({ product: "cd_plan_starter", amount: 14900, subscriptionId: sub, start: periodStart - 30 * DAY, end: periodStart })];
    expect(planInvoiceGrants(invoice({ customer: "cus", subscriptionId: sub, billingReason: "subscription_cycle", lines }), lines, plans, now)).toEqual([]);
  });

  it("throws on a product that is not a plan, so the event is retried and seen", () => {
    const lines = [line({ product: "prod_other", amount: 100, subscriptionId: sub, start: periodStart, end: periodEnd })];
    expect(() => planInvoiceGrants(invoice({ customer: "cus", subscriptionId: sub, billingReason: "subscription_cycle", lines }), lines, plans, now)).toThrow(/not a plan/);
  });
});
