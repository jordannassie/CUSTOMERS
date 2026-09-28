import { planInvoiceGrants, type PlanCredits } from "../webhooks/credits";
import { at, FakeStripe } from "./fake-stripe.test-helpers";
import type { PlanChange, PlanChangeContext } from "./planner";
import { applyPlanChange, previewPlanChange, type PlanChangeDeps } from "./service";

// Shared setup for the plan change scenarios. Period: September 1 to October 1, 2026 (30 days); "mid-month" is
// September 16, so 15 of 30 days are left, as in MVP_SPEC 11.5.

export const A = "00000000-0000-4000-8000-00000000000a";
export const B = "00000000-0000-4000-8000-00000000000b";
export const C = "00000000-0000-4000-8000-00000000000c";
export const PERIOD_START = at("2026-09-01T00:00:00Z");
export const MID_MONTH = at("2026-09-16T00:00:00Z");
export const RENEWAL = at("2026-10-01T00:00:00Z");

export const plansByProduct = new Map<string, PlanCredits>([
  ["cd_plan_starter", { planId: "starter", monthlyCredits: 1200 }],
  ["cd_plan_pro", { planId: "pro", monthlyCredits: 2500 }],
]);

export function setup(opts: { a?: string; b?: string | null; status?: "active" | "trialing"; agencyStatus?: string } = {}) {
  const items = [{ businessId: A, price: opts.a ?? "price_starter" }];
  if (opts.b !== null) items.push({ businessId: B, price: opts.b ?? "price_starter" });
  const stripe = new FakeStripe({ now: MID_MONTH, periodStart: PERIOD_START, status: opts.status, items });
  const ctx: PlanChangeContext = {
    agencyId: "agency-1",
    agencyStatus: opts.agencyStatus ?? opts.status ?? "active",
    subscriptionId: stripe.subscriptionId,
    plans: [
      { id: "starter", name: "Starter", priceCents: 14900, stripePriceId: "price_starter" },
      { id: "pro", name: "Pro", priceCents: 24900, stripePriceId: "price_pro" },
    ],
    businesses: [
      { id: A, name: "Acme Plumbing", planId: null, itemId: `si_${A}` },
      { id: B, name: "Bay Dental", planId: null, itemId: `si_${B}` },
      { id: C, name: "Corner Bakery", planId: null, itemId: null },
    ],
  };
  const deps: PlanChangeDeps = { stripe, plansByProduct, now: () => new Date(stripe.clock * 1000) };
  const change = async (c: PlanChange) => {
    const preview = await previewPlanChange(ctx, c, deps);
    const done = await applyPlanChange(ctx, c, preview.previewedAt, deps);
    return { preview, done };
  };
  return { stripe, ctx, deps, change };
}

export const creditsOf = (stripe: FakeStripe, index: number) => {
  const inv = stripe.invoices[index];
  return planInvoiceGrants(inv, inv.lines.data, plansByProduct, new Date(stripe.clock * 1000));
};
export const priceOf = (stripe: FakeStripe, business: string) => stripe.items.find((i) => i.metadata.business_id === business)?.price;
