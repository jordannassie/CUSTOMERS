import "server-only";
import { checkoutFixtures } from "./checkout-client";
import { getStripe, isStripeConfigured } from "./stripe";
import { applyCompletedCheckout, applyLatestInvoice } from "./webhooks";

// When checkout.session.completed is missed or late, the page that took the payment asks Stripe itself and applies
// the session with the webhook's own handler. Before this, a missed webhook left the card step waiting, and starting
// it again made a second subscription that no agency was linked to.

const LOOK_BACK_SECONDS = 2 * 24 * 60 * 60;

const live = () => isStripeConfigured() && !checkoutFixtures();

/** Finds this agency's completed trial or plan checkout and links it. True when one was applied. */
export async function recoverPlanCheckout(agencyId: string, email: string | null): Promise<boolean> {
  if (!live() || !email) return false;
  try {
    const since = Math.floor(Date.now() / 1000) - LOOK_BACK_SECONDS;
    const { data } = await getStripe().checkout.sessions.list({
      customer_details: { email },
      status: "complete",
      created: { gte: since },
      limit: 20,
    });
    const session = data.find((s) => s.mode === "subscription" && s.subscription && s.metadata?.agency_id === agencyId);
    if (!session) return false;
    await applyCompletedCheckout(session);
    return true;
  } catch (error) {
    const e = error as { type?: string; message?: string };
    console.error("[billing/recovery] plan checkout lookup failed", e?.type ?? e?.message);
    return false;
  }
}

/** A paid top-up the webhook has not granted yet: grants it the same way. True when the session was applied. */
export async function recoverTopUp(agencyId: string, sessionId: string): Promise<boolean> {
  if (!live()) return false;
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const mine = session.metadata?.agency_id === agencyId && session.metadata?.kind === "topup";
    if (!mine || session.status !== "complete" || session.payment_status !== "paid") return false;
    await applyCompletedCheckout(session);
    return true;
  } catch (error) {
    const e = error as { type?: string; message?: string };
    console.error("[billing/recovery] top-up lookup failed", e?.type ?? e?.message);
    return false;
  }
}

/** The subscription is linked but invoice.paid never granted its credits: grants them the same way (A1). */
export async function recoverInvoiceCredits(subscriptionId: string): Promise<boolean> {
  if (!live()) return false;
  try {
    await applyLatestInvoice(subscriptionId);
    return true;
  } catch (error) {
    const e = error as { type?: string; message?: string };
    console.error("[billing/recovery] invoice lookup failed", e?.type ?? e?.message);
    return false;
  }
}
