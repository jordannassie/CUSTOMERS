import { describe, expect, it, vi } from "vitest";
import type { PlanChangeStripe } from "../plan-change/client";
import { A, B, C, RENEWAL, setup } from "../plan-change/scenario.test-helpers";
import type { PortalClient } from "./access";
import type { BillingRows } from "./dal";
import { billingView, portalUrl } from "./service";

// The billing page's reads (B-46) against the in-memory Stripe: next charge, pending changes, cancel, trial,
// and what the page says when Stripe is missing or fails. No Stripe calls.

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();

function rows(status = "active", subscriptionId: string | null = "sub_fake"): BillingRows {
  return {
    agency: { status, trialEndsAt: status === "trialing" ? iso(RENEWAL) : null, periodEndsAt: iso(RENEWAL), subscriptionId, customerId: "cus_fake" },
    plans: [
      { id: "starter", name: "Starter", priceCents: 14900, monthlyCredits: 1200 },
      { id: "pro", name: "Pro", priceCents: 24900, monthlyCredits: 2500 },
    ],
    businesses: [
      { id: A, name: "Acme Plumbing", planId: "pro", itemId: `si_${A}`, deleted: false },
      { id: B, name: "Bay Dental", planId: "starter", itemId: `si_${B}`, deleted: false },
      { id: C, name: "Corner Bakery", planId: null, itemId: null, deleted: false },
    ],
  };
}

describe("billingView", () => {
  it("lists each business on its plan, the ones not on it, and the next charge", async () => {
    const { stripe, ctx } = setup({ a: "price_pro" });
    const view = await billingView({ rows: rows(), access: { context: ctx, stripe } });
    expect(view.stripe).toBe("ok");
    expect(view.onPlan.map((b) => [b.name, b.plan.name, b.pending])).toEqual([
      ["Acme Plumbing", "Pro", null],
      ["Bay Dental", "Starter", null],
    ]);
    expect(view.notOnPlan).toEqual([{ id: C, name: "Corner Bakery" }]);
    expect(view.nextCharge).toEqual({ at: iso(RENEWAL), amountCents: 24900 + 14900 });
    expect(view.canChange).toBe(true);
    expect(view.cancelAt).toBeNull();
  });

  it("shows what each business is charged, and the plan's new price from the renewal when it pays an older one (D-93)", async () => {
    const { stripe, ctx } = setup({ a: "price_pro" });
    const raised = rows();
    raised.plans = raised.plans.map((p) => (p.id === "starter" ? { ...p, priceCents: 16900 } : p));
    const view = await billingView({ rows: raised, access: { context: ctx, stripe } });
    expect(view.onPlan.map((b) => [b.name, b.priceCents, b.newPrice])).toEqual([
      ["Acme Plumbing", 24900, null],
      ["Bay Dental", 14900, { cents: 16900, at: iso(RENEWAL) }],
    ]);
    // Without Stripe, the price the webhook saved.
    raised.businesses = raised.businesses.map((b) => (b.id === B ? { ...b, priceCents: 15900 } : b));
    const offline = await billingView({ rows: raised, access: null });
    expect(offline.onPlan.find((b) => b.id === B)?.priceCents).toBe(15900);
  });

  it("never offers a deleted business, and marks one whose item runs to the period end (BUG-120)", async () => {
    const { stripe, ctx } = setup({ a: "price_pro" });
    const base = rows();
    base.businesses = base.businesses.map((b) => (b.id === C || b.id === B ? { ...b, deleted: true } : b));
    const view = await billingView({ rows: base, access: { context: ctx, stripe } });
    expect(view.notOnPlan).toEqual([]);
    expect(view.onPlan.map((b) => [b.name, b.deleted])).toEqual([
      ["Acme Plumbing", false],
      ["Bay Dental", true],
    ]);
  });

  it("shows a pending downgrade and removal, and the smaller next charge", async () => {
    const { stripe, ctx, change } = setup({ a: "price_pro" });
    await change({ kind: "downgrade", businessId: A, planId: "starter" });
    await change({ kind: "remove", businessId: B });
    const view = await billingView({ rows: rows(), access: { context: ctx, stripe } });
    expect(view.onPlan.map((b) => b.pending)).toEqual([
      { kind: "plan", planName: "Starter", at: iso(RENEWAL) },
      { kind: "remove", at: iso(RENEWAL) },
    ]);
    expect(view.nextCharge?.amountCents).toBe(14900);
  });

  it("after a cancel, shows when the plan ends and no next charge", async () => {
    const { stripe, ctx, change } = setup();
    await change({ kind: "cancel" });
    const view = await billingView({ rows: rows(), access: { context: ctx, stripe } });
    expect(view.cancelAt).toBe(iso(RENEWAL));
    expect(view.nextCharge).toBeNull();
    expect(stripe.calls.filter((c) => c.method === "previewInvoice")).toHaveLength(0);
  });

  it("during a trial, the first charge is at the trial end", async () => {
    const { stripe, ctx } = setup({ a: "price_pro", status: "trialing" });
    const view = await billingView({ rows: rows("trialing"), access: { context: ctx, stripe } });
    expect(view.trialEndsAt).toBe(iso(RENEWAL));
    expect(view.nextCharge).toEqual({ at: iso(RENEWAL), amountCents: 24900 + 14900 });
  });

  it("says so when there is no plan, no Stripe, or Stripe fails", async () => {
    expect((await billingView({ rows: rows("trialing", null), access: null })).stripe).toBe("none");
    expect((await billingView({ rows: rows(), access: null })).stripe).toBe("unavailable");

    const failing = { retrieveSubscription: () => Promise.reject(Object.assign(new Error("down"), { type: "StripeConnectionError" })) };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ctx } = setup();
    const view = await billingView({ rows: rows(), access: { context: ctx, stripe: failing as unknown as PlanChangeStripe } });
    expect(view.stripe).toBe("error");
    expect(view.canChange).toBe(false);
    expect(view.onPlan).toHaveLength(2);

    // A subscription Stripe does not have is not an outage: "missing", not "refresh to try again" (2026-10-14).
    const gone = { retrieveSubscription: () => Promise.reject(Object.assign(new Error("No such subscription"), { type: "StripeInvalidRequestError", code: "resource_missing", statusCode: 404 })) };
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await billingView({ rows: rows(), access: { context: ctx, stripe: gone as unknown as PlanChangeStripe } })).stripe).toBe("missing");
  });

  it("a past due plan keeps its lines; an ended one can't be changed", async () => {
    const { stripe, ctx } = setup();
    expect((await billingView({ rows: rows("past_due"), access: { context: ctx, stripe } })).canChange).toBe(true);
    expect((await billingView({ rows: rows("canceled"), access: { context: ctx, stripe } })).canChange).toBe(false);
  });
});

describe("portalUrl", () => {
  const client = (url: string | Error): PortalClient => ({
    mode: "fixture",
    createSession: vi.fn(async () => {
      if (url instanceof Error) throw url;
      return url;
    }),
  });

  it("opens the portal for the agency's own customer and returns to billing", async () => {
    const c = client("https://billing.stripe.com/p/session/test");
    const result = await portalUrl({ client: c, customerId: "cus_1", returnUrl: "http://localhost/settings/billing" });
    expect(result).toEqual({ ok: true, data: { url: "https://billing.stripe.com/p/session/test" } });
    expect(c.createSession).toHaveBeenCalledWith("cus_1", "http://localhost/settings/billing");
  });

  it("refuses without Stripe or a customer, and reports a Stripe failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await portalUrl({ client: null, customerId: "cus_1", returnUrl: "x" })).toMatchObject({ ok: false, status: 503 });
    expect(await portalUrl({ client: client("u"), customerId: null, returnUrl: "x" })).toMatchObject({ ok: false, status: 404 });
    expect(await portalUrl({ client: client(new Error("boom")), customerId: "cus_1", returnUrl: "x" })).toMatchObject({
      ok: false,
      status: 502,
    });
  });
});

// 2026-10-15: a business deleted during a trial was listed at $149 a month.
describe("a business deleted during a trial", () => {
  const deletedB = (base: BillingRows) => ({ ...base, businesses: base.businesses.map((b) => (b.id === B ? { ...b, deleted: true } : b)) });

  it("is not listed once Stripe has taken its item off, even before the webhook updates our row", async () => {
    const { stripe, ctx } = setup({ a: "price_pro", status: "trialing" });
    await stripe.updateSubscription(stripe.subscriptionId, { items: [{ id: `si_${B}`, deleted: true }], proration_behavior: "none" }, "k");
    const view = await billingView({ rows: deletedB(rows("trialing")), access: { context: ctx, stripe } });
    expect(view.onPlan.map((b) => b.name)).toEqual(["Acme Plumbing"]);
  });

  it("shows as removed and not charged, with no pending change, while its item is still there", async () => {
    const { stripe, ctx, change } = setup({ status: "trialing" });
    await change({ kind: "remove", businessId: B });
    const view = await billingView({ rows: deletedB(rows("trialing")), access: { context: ctx, stripe } });
    expect(view.onPlan.map((b) => [b.name, b.notCharged, b.pending])).toEqual([
      ["Acme Plumbing", false, null],
      ["Bay Dental", true, null],
    ]);
  });

  it("on a paid plan, still shows the item running to the period end", async () => {
    const { stripe, ctx, change } = setup();
    await change({ kind: "remove", businessId: B });
    const view = await billingView({ rows: deletedB(rows()), access: { context: ctx, stripe } });
    expect(view.onPlan.find((b) => b.id === B)).toMatchObject({ deleted: true, notCharged: false, pending: { kind: "remove" } });
  });
});
