import type Stripe from "stripe";
import { dispatchEvent, type WebhookDeps } from "./handlers";

// A1 for a plan that starts on our own page (2026-10-15): "Start my plan now" and the plan checkout used to wait only
// for invoice.paid and customer.subscription.updated, so a missed webhook left the page waiting for good. This
// applies the subscription's current state and its latest paid invoice with the webhook's own handlers. Grants are
// keyed by invoice line (MVP_SPEC 11.3), so the webhook arriving later changes nothing.

export type StripeSync = {
  /** Stripe's subscription status after the sync. */
  status: Stripe.Subscription.Status;
  /** The latest invoice is paid, and its credits are granted. */
  paid: boolean;
};

const idOf = (ref: string | { id?: string } | null | undefined) => (typeof ref === "string" ? ref : ref?.id ?? null);

export async function syncFromStripe(deps: WebhookDeps, subscriptionId: string): Promise<StripeSync> {
  const sub = await deps.stripe.retrieveSubscription(subscriptionId);
  // The same work as customer.subscription.updated: agency status, trial and period dates, each business's plan.
  await dispatchEvent(deps, { id: `sync_${sub.id}`, type: "customer.subscription.updated", data: { object: sub } } as unknown as Stripe.Event);
  const invoiceId = idOf(sub.latest_invoice);
  if (!invoiceId) return { status: sub.status, paid: false };
  const invoice = await deps.stripe.retrieveInvoice(invoiceId);
  if (invoice.status !== "paid") return { status: sub.status, paid: false };
  await dispatchEvent(deps, { id: `sync_${invoice.id}`, type: "invoice.paid", data: { object: invoice } } as unknown as Stripe.Event);
  return { status: sub.status, paid: true };
}
