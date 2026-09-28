import type Stripe from "stripe";
import { periodEnd, phasesOf } from "../plan-change/planner";
import type { BillingRows } from "./dal";

// Pure: what the billing page shows (B-46, MVP_SPEC 11). Plans per business come from the database (the webhook
// keeps it in step); pending changes, a pending cancel and the next charge come from Stripe.

export type BillingPlan = { id: string; name: string; priceCents: number; monthlyCredits: number };

export type PendingChange = { kind: "plan"; planName: string; at: string } | { kind: "remove"; at: string };

export type BillingBusiness = { id: string; name: string; plan: BillingPlan; pending: PendingChange | null };

/** "none": no plan yet. "unavailable": Stripe is not set up here. "error": Stripe could not be reached. */
export type StripeState = "ok" | "none" | "unavailable" | "error";

export type BillingView = {
  status: string;
  stripe: StripeState;
  trialEndsAt: string | null;
  plans: BillingPlan[];
  onPlan: BillingBusiness[];
  notOnPlan: { id: string; name: string }[];
  nextCharge: { at: string; amountCents: number } | null;
  cancelAt: string | null;
  /** Buttons that change the plan only show when a change can go through. */
  canChange: boolean;
};

export type StripeSnapshot = {
  sub: Stripe.Subscription;
  schedule: Stripe.SubscriptionSchedule | null;
  upcoming: Stripe.Invoice | null;
  /** Stripe price ID to plan ID. */
  planOfPrice: Map<string, string>;
};

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
const idOf = (ref: string | { id: string }) => (typeof ref === "string" ? ref : ref.id);

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
    } else if (idOf(later.price) !== idOf(item.price)) {
      const plan = plans.find((p) => p.id === snapshot.planOfPrice.get(idOf(later.price)));
      if (plan) pending.set(businessId, { kind: "plan", planName: plan.name, at });
    }
  }
  return pending;
}

export function buildBillingView(rows: BillingRows, stripe: StripeSnapshot | Exclude<StripeState, "ok">): BillingView {
  const snapshot = typeof stripe === "string" ? null : stripe;
  const pending = snapshot ? pendingChanges(snapshot, rows.plans) : new Map<string, PendingChange>();
  const onPlan: BillingBusiness[] = [];
  const notOnPlan: BillingView["notOnPlan"] = [];
  for (const b of rows.businesses) {
    const plan = rows.plans.find((p) => p.id === b.planId);
    if (plan) onPlan.push({ id: b.id, name: b.name, plan, pending: pending.get(b.id) ?? null });
    else notOnPlan.push({ id: b.id, name: b.name });
  }

  const sub = snapshot?.sub ?? null;
  const ended = rows.agency.status === "canceled" || sub?.status === "canceled";
  const ends = sub && !ended ? iso(periodEnd(sub)) : null;
  const cancelling = !!sub?.cancel_at_period_end;

  return {
    status: rows.agency.status,
    stripe: snapshot ? "ok" : (stripe as Exclude<StripeState, "ok">),
    trialEndsAt: rows.agency.status === "trialing" ? (rows.agency.trialEndsAt ?? ends) : null,
    plans: rows.plans,
    onPlan,
    notOnPlan,
    nextCharge: ends && !cancelling && snapshot?.upcoming ? { at: ends, amountCents: snapshot.upcoming.amount_due } : null,
    cancelAt: cancelling ? ends : null,
    canChange: !!snapshot && !ended,
  };
}
