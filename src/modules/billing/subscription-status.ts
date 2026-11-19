import "server-only";
import { getStripe } from "./stripe";
import { isMissingInStripe } from "./stripe-missing";
import type { AgencyStatus } from "./webhooks/dal";
import { agencyStatusFor } from "./webhooks/handlers";

/**
 * The agency status a subscription has in Stripe right now, mapped the way the webhooks map it. Used when an admin
 * unsuspends an agency: Stripe status changes that arrived while it was suspended were not saved. "canceled" when
 * Stripe has no such subscription; null for a status that leaves the agency as it is (a first payment in progress).
 * Throws when Stripe cannot be reached.
 */
export async function subscriptionAgencyStatus(subscriptionId: string): Promise<AgencyStatus | null> {
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    return agencyStatusFor(subscription.status);
  } catch (error) {
    if (isMissingInStripe(error)) return "canceled";
    throw error;
  }
}
