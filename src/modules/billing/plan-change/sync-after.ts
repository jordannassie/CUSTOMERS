import "server-only";
import type { BillingAccess } from "../account/access";

// BUG-238: a change applied in Stripe reached the database only with the webhook, so the page refreshed before it
// landed still showed the old plan and offered the same upgrade again. Right after the change, the subscription is
// saved from Stripe with the webhook's own handlers (A1); they are idempotent, so the webhook arriving later changes
// nothing. Never fails the change itself: it already happened in Stripe, and the webhook still brings it.
export async function syncAfterChange(access: Pick<BillingAccess, "sync">, subscriptionId: string | null): Promise<void> {
  if (!subscriptionId) return;
  try {
    await access.sync(subscriptionId);
  } catch (error) {
    const e = error as { type?: string; message?: string };
    console.error("[billing/plan-change] sync after the change failed", e?.type ?? e?.message);
  }
}
