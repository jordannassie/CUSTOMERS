import "server-only";
import { loadPlanChangeData } from "../plan-change/dal";
import { resyncSubscription } from "../webhooks";
import { isMissingInStripe } from "../stripe-missing";
import { billingAccess, type BillingAccess } from "./access";
import { loadBillingRows } from "./dal";
import { billingView } from "./service";
import type { BillingView } from "./summary";

/**
 * Everything the billing page shows for one agency. Pass the agency from requireAgency(). "resynced" when the
 * subscription was just saved again from Stripe: the page then loads once more, since reads repeated within one
 * render return the first answer. `repair: false` on that second load, so it never repeats.
 */
export async function loadBillingPage(agencyId: string, { repair = true } = {}): Promise<BillingView | "resynced"> {
  const [rows, data] = await Promise.all([loadBillingRows(agencyId), loadPlanChangeData(agencyId)]);
  const access = rows.agency.subscriptionId ? await billingAccess(data) : null;
  if (repair && access && rows.agency.subscriptionId && (await resynced(access, rows.agency.subscriptionId, data.context.businesses))) {
    return "resynced";
  }
  return billingView({ rows, access });
}

/**
 * BUG-121: subscriptions started before the BUG-104 fix have items no business row points at, so Billing said
 * "Not on your plan" for businesses already paying. When Stripe has an item the database doesn't, the subscription
 * is saved again from Stripe, the way the webhook does. True when it was.
 */
async function resynced(access: BillingAccess, subscriptionId: string, businesses: { itemId: string | null }[]): Promise<boolean> {
  if (access.mode !== "stripe") return false;
  try {
    const sub = await access.stripe.retrieveSubscription(subscriptionId);
    if (sub.status === "canceled") return false;
    const linked = new Set(businesses.map((b) => b.itemId).filter(Boolean));
    if (sub.items.data.every((i) => linked.has(i.id))) return false;
    await resyncSubscription(subscriptionId);
    return true;
  } catch (error) {
    // Not in Stripe: nothing to re-sync; the page says so (billingView).
    if (isMissingInStripe(error)) return false;
    const e = error as { type?: string; message?: string };
    console.error("[billing/account] re-sync failed", e?.type ?? e?.message);
    return false;
  }
}
