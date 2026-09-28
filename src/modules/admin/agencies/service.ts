const DAY = 24 * 60 * 60 * 1000;

// MVP_SPEC 23: a deleted account can be restored by an admin for 30 days, then pg_cron removes it.
export const RESTORE_DAYS = 30;

// Statuses Stripe events manage; suspend and delete sit on top of them (billing/README).
export const BILLING_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export const isBillingStatus = (status: unknown): status is BillingStatus =>
  typeof status === "string" && (BILLING_STATUSES as readonly string[]).includes(status);

/** Last moment a deleted agency can be restored, or null when it is not deleted. */
export function restoreDeadline(status: string, deletedAt: string | null): Date | null {
  if (status !== "deleted" || !deletedAt) return null;
  return new Date(new Date(deletedAt).getTime() + RESTORE_DAYS * DAY);
}

export function canRestore(status: string, deletedAt: string | null, now = new Date()): boolean {
  const deadline = restoreDeadline(status, deletedAt);
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
