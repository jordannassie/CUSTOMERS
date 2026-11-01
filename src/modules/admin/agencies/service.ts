const DAY = 24 * 60 * 60 * 1000;

// Statuses Stripe events manage; suspend and delete sit on top of them (billing/README).
export const BILLING_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export const isBillingStatus = (status: unknown): status is BillingStatus =>
  typeof status === "string" && (BILLING_STATUSES as readonly string[]).includes(status);

/**
 * Last moment a deleted agency can be restored, or null when it is not deleted. It is the purge date the delete
 * saved (MVP_SPEC 23): after it, pg_cron removes the account.
 */
export function restoreDeadline(status: string, purgeAfter: string | null): Date | null {
  if (status !== "deleted" || !purgeAfter) return null;
  return new Date(purgeAfter);
}

export function canRestore(status: string, purgeAfter: string | null, now = new Date()): boolean {
  const deadline = restoreDeadline(status, purgeAfter);
  return deadline !== null && deadline > now;
}

/** Unsuspend goes back to the status the agency had when it was suspended; an unknown one becomes active. */
export function statusAfterUnsuspend(previous: unknown): BillingStatus {
  return isBillingStatus(previous) ? previous : "active";
}

/** A trial always grows: the days are added to the current end, or to now if it has already passed. */
export function extendedTrialEnd(current: string | null, days: number, now = new Date()): Date {
  const from = Math.max(current ? new Date(current).getTime() : 0, now.getTime());
  return new Date(from + days * DAY);
}

/** "2 Starter, 1 Pro", largest group first. */
export function planMix(plans: string[]): string {
  const counts = new Map<string, number>();
  for (const plan of plans) counts.set(plan, (counts.get(plan) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([plan, n]) => `${n} ${plan}`)
    .join(", ");
}

// What admin shows for an agency's status. Two trials are not real trials: a signup that never reached Stripe
// checkout (no subscription, no trial end), and a trial whose end has passed while Stripe has not moved it on.
// Only a trialing agency can be either; deleted, suspended and the rest show as they are.
export function displayStatus(
  a: { status: string; hasSubscription: boolean; trialEndsAt: string | null },
  now = new Date(),
): string {
  if (a.status !== "trialing") return a.status;
  if (!a.hasSubscription && !a.trialEndsAt) return "signup_unfinished";
  if (a.trialEndsAt && new Date(a.trialEndsAt) <= now) return "trial_ended";
  return a.status;
}
