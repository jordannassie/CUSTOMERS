import "server-only";
import { getStripe } from "./stripe";
import { isMissingInStripe, isOtherStripeMode } from "./stripe-missing";

export type PauseOutcome = "paused" | "resumed" | "nothing_in_stripe";

/**
 * Pauses or resumes collecting payment on an agency's subscription, for the admin Suspend and Unsuspend actions.
 * While paused, Stripe voids each new invoice ("void"), so a suspended customer is not charged for the time they
 * cannot use the app; access and the plan itself stay as they are. A subscription Stripe does not have here (deleted,
 * a reset sandbox, or a live one seen with test keys on the preview, D-43) has nothing to pause.
 */
export async function setSubscriptionPaused(subscriptionId: string, paused: boolean): Promise<PauseOutcome> {
  try {
    // An empty string clears pause_collection, which resumes collection from the next invoice.
    await getStripe().subscriptions.update(subscriptionId, { pause_collection: paused ? { behavior: "void" } : "" });
    return paused ? "paused" : "resumed";
  } catch (error) {
    if (isMissingInStripe(error) || isOtherStripeMode(error)) return "nothing_in_stripe";
    throw error;
  }
}
