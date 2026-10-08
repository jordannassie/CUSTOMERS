import "server-only";
import { billingAccess } from "../account/access";
import { loadPlanChangeData, type PlanChangeData } from "./dal";
import { PlanChangeError, type PlanChangeContext } from "./planner";
import { applyPlanChange, previewPlanChange } from "./service";

// BUG-071, D-57: a business set up after the first joins the agency's subscription when setup finishes. On a trial
// that costs nothing until the trial ends, then it is billed with the others; on a paid plan the prorated amount is
// charged at once, and setup shows that amount before the owner finishes. Same Stripe calls as "Add on" on Billing.

export type SetupAddOn = {
  planId: string;
  planName: string;
  priceCents: number;
  trialing: boolean;
  /** Charged when setup finishes; 0 on a trial. */
  todayCents: number;
  /** Send back on finish, so the charge matches what was shown (Stripe proration_date). */
  previewedAt: number;
};

export type SetupAddOnResult = { ok: true } | { ok: false; status: number; error: string };

const LIVE = new Set(["trialing", "active"]);

/** The plan the agency's other businesses are on, so every business shares one plan by default. */
export function planForNewBusiness(context: PlanChangeContext, businessId: string): string | null {
  const used = context.businesses.find((b) => b.id !== businessId && b.planId)?.planId ?? "starter";
  return context.plans.some((p) => p.id === used) ? used : null;
}

async function prepare(agencyId: string, businessId: string) {
  const data: PlanChangeData = await loadPlanChangeData(agencyId);
  const { context } = data;
  // No subscription (a test agency, or no plan yet): Choose plan bills every business when a plan starts.
  if (!context.subscriptionId || !LIVE.has(context.agencyStatus)) return null;
  const business = context.businesses.find((b) => b.id === businessId);
  // Not this agency's business, or already on the plan: nothing to add.
  if (!business || business.planId) return null;
  // Only a business added after one already on the plan. The first business joins the subscription at checkout,
  // and its row can arrive from the webhook after setup finishes; adding it here would bill it twice.
  if (!context.businesses.some((b) => b.id !== businessId && b.planId)) return null;
  const planId = planForNewBusiness(context, businessId);
  if (!planId) return null;
  const access = await billingAccess(data);
  if (!access) return null;
  const deps = { stripe: access.stripe, plansByProduct: data.plansByProduct, now: () => new Date() };
  return { context: access.context, deps, planId };
}

/** What finishing setup will add to the bill, or null when this business is not added to a subscription. */
export async function previewSetupAddOn(agencyId: string, businessId: string): Promise<SetupAddOn | null> {
  const ready = await prepare(agencyId, businessId);
  if (!ready) return null;
  const change = { kind: "add" as const, businessId, planId: ready.planId };
  const preview = await previewPlanChange(ready.context, change, ready.deps);
  const plan = ready.context.plans.find((p) => p.id === ready.planId)!;
  const trialing = ready.context.agencyStatus === "trialing";
  return {
    planId: plan.id,
    planName: plan.name,
    priceCents: plan.priceCents,
    trialing,
    todayCents: trialing ? 0 : preview.amountCents,
    previewedAt: preview.previewedAt,
  };
}

/** Adds the business to the subscription; a no-op when there is no subscription to add it to. */
export async function addBusinessAtSetup(
  agencyId: string,
  businessId: string,
  confirmed: { planId: string; previewedAt: number } | null,
): Promise<SetupAddOnResult> {
  const ready = await prepare(agencyId, businessId);
  if (!ready) return { ok: true };
  if (!confirmed || confirmed.planId !== ready.planId) {
    return { ok: false, status: 409, error: "Your plan changed while you were setting up. Check the price and finish again." };
  }
  try {
    await applyPlanChange(ready.context, { kind: "add", businessId, planId: ready.planId }, confirmed.previewedAt, ready.deps);
    return { ok: true };
  } catch (error) {
    if (error instanceof PlanChangeError) return { ok: false, status: error.status, error: error.message };
    const e = error as { type?: string; statusCode?: number };
    if (e?.type === "StripeCardError" || e?.statusCode === 402) {
      return { ok: false, status: 402, error: "Your card was declined, so this business wasn't added. Update your card on Billing and try again." };
    }
    if (typeof e?.type === "string" && e.type.startsWith("Stripe")) {
      console.error("[billing/setup-add-on] Stripe error", e.type, e.statusCode);
      return { ok: false, status: 502, error: "We couldn't reach our payment provider. Nothing was charged. Try again in a minute." };
    }
    throw error;
  }
}
