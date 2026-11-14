import type Stripe from "stripe";

// 2026-10-15: an agency Stripe has as paid and active while this app still shows a trial means a missed or failed
// webhook, and the agency can't add businesses until it is applied. Pure, so the rule is unit tested.

export const PAID_NOT_ACTIVE_KIND = "paid_not_active";
export const GRACE_MS = 5 * 60 * 1000;

/** True when Stripe ended the trial and has the plan active more than 5 minutes ago. */
export function paidNotActive(sub: Pick<Stripe.Subscription, "status" | "trial_end">, now: Date): boolean {
  if (sub.status !== "active" || !sub.trial_end) return false;
  return sub.trial_end * 1000 <= now.getTime() - GRACE_MS;
}

export function paidNotActiveMessage(names: string[]): string {
  const who = names.length === 1 ? `1 agency (${names[0]}) is` : `${names.length} agencies (${names.slice(0, 5).join(", ")}${names.length > 5 ? ", and more" : ""}) are`;
  return `${who} paid and active in Stripe but still on a trial here after more than 5 minutes. Their Stripe webhook was missed or failed, so they can't add businesses. Check webhook deliveries in Stripe; opening Start my plan now or Billing syncs them.`;
}
