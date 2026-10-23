import type Stripe from "stripe";
import { isCancelling, periodEnd, phasesOf } from "../plan-change/planner";
import { planIdOfPrice, samePlanPrice } from "../plan-price";
import type { BillingRows } from "./dal";

// Pure: what the billing page shows (B-46, MVP_SPEC 11). Plans per business come from the database (the webhook
// keeps it in step); pending changes, a pending cancel and the next charge come from Stripe.

export type BillingPlan = { id: string; name: string; priceCents: number; monthlyCredits: number };

export type PendingChange = { kind: "plan"; planName: string; at: string } | { kind: "remove"; at: string };

/**
 * `deleted`: the business was deleted and its item runs to the period end; no plan changes are offered.
 * `notCharged`: deleted during a trial, so it is never billed and shows no price (2026-10-15).
 */
export type BillingBusiness = {
  id: string;
  name: string;
  plan: BillingPlan;
  pending: PendingChange | null;
  deleted: boolean;
  notCharged: boolean;
};

/**
 * "none": no plan yet. "unavailable": Stripe is not set up here. "error": Stripe could not be reached. "missing": the
 * saved subscription is not in Stripe (deleted there, or never real).
 */
export type StripeState = "ok" | "none" | "unavailable" | "error" | "missing";

export type BillingView = {
  status: string;
  stripe: StripeState;
  trialEndsAt: string | null;
  plans: BillingPlan[];
  onPlan: BillingBusiness[];
  notOnPlan: { id: string; name: string }[];
  nextCharge: { at: string; amountCents: number } | null;
  cancelAt: string | null;
  /** After the trial: when a move to a cheaper plan happens (the renewal, D-57). Null in a trial, where it is at once. */
  renewsAt: string | null;
  /** Buttons that change the plan only show when a change can go through. */
  canChange: boolean;
};

export type StripeSnapshot = {
  sub: Stripe.Subscription;
  schedule: Stripe.SubscriptionSchedule | null;
  upcoming: Stripe.Invoice | null;
};

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();

function pendingChanges(snapshot: StripeSnapshot, plans: BillingPlan[]): Map<string, PendingChange> {
  const pending = new Map<string, PendingChange>();
  if (!snapshot.schedule) return pending;
  const { current, next } = phasesOf(snapshot.schedule);
  if (!next) return pending;
  const at = iso(next.start_date || current.end_date);
  const nextOf = new Map(next.items.map((i) => [i.metadata?.business_id, i]));
  for (const item of current.items) {
    const businessId = item.metadata?.business_id;
    if (!businessId) continue;
    const later = nextOf.get(businessId);
    if (!later) {
      pending.set(businessId, { kind: "remove", at });
    } else if (!samePlanPrice(later.price, item.price)) {
      // Each business has a price of its own (BUG-103), so the plan comes from the price's product. Another price of
      // the same plan is not a change (2026-10-15).
      const plan = plans.find((p) => p.id === planIdOfPrice(later.price, plans));
      if (plan) pending.set(businessId, { kind: "plan", planName: plan.name, at });
    }
  }
  return pending;
}

export function buildBillingView(rows: BillingRows, stripe: StripeSnapshot | Exclude<StripeState, "ok">): BillingView {
  const snapshot = typeof stripe === "string" ? null : stripe;
  const pending = snapshot ? pendingChanges(snapshot, rows.plans) : new Map<string, PendingChange>();
  const sub = snapshot?.sub ?? null;
  const trialing = rows.agency.status === "trialing" || sub?.status === "trialing";
  // Stripe no longer bills a deleted business whose item is gone, even before the webhook updates our row.
  const inStripe = (b: BillingRows["businesses"][number]) =>
    !sub || sub.items.data.some((i) => i.metadata?.business_id === b.id || (b.itemId !== null && i.id === b.itemId));
  const onPlan: BillingBusiness[] = [];
  const notOnPlan: BillingView["notOnPlan"] = [];
  for (const b of rows.businesses) {
    const plan = rows.plans.find((p) => p.id === b.planId);
    if (plan && b.deleted && !inStripe(b)) continue;
    if (plan) {
      const notCharged = b.deleted && trialing;
      onPlan.push({ id: b.id, name: b.name, plan, pending: notCharged ? null : (pending.get(b.id) ?? null), deleted: b.deleted, notCharged });
    } else if (!b.deleted) notOnPlan.push({ id: b.id, name: b.name });
  }

  const ended = rows.agency.status === "canceled" || sub?.status === "canceled";
  const ends = sub && !ended ? iso(periodEnd(sub)) : null;
  const cancelling = !!sub && isCancelling(sub);

  return {
    status: rows.agency.status,
    stripe: snapshot ? "ok" : (stripe as Exclude<StripeState, "ok">),
    trialEndsAt: rows.agency.status === "trialing" ? (rows.agency.trialEndsAt ?? ends) : null,
    plans: rows.plans,
    onPlan,
    notOnPlan,
    nextCharge: ends && !cancelling && snapshot?.upcoming ? { at: ends, amountCents: snapshot.upcoming.amount_due } : null,
    cancelAt: cancelling ? ends : null,
    renewsAt: ends && !trialing ? ends : null,
    canChange: !!snapshot && !ended,
  };
}
