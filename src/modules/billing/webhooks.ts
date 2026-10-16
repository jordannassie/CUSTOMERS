import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripe } from "./stripe";
import { createWebhookStore } from "./webhooks/dal";
import { sendBillingEmail } from "./webhooks/emails";
import { dispatchEvent, type StripeReader, type WebhookDeps } from "./webhooks/handlers";
import { syncFromStripe, type StripeSync } from "./webhooks/sync";

// Stripe webhook processing (B-42, MVP_SPEC 11.3, D-39). The only place billing state and plan credits come from.

export type WebhookResult = { status: number; body: Record<string, unknown> };

function stripeReader(): StripeReader {
  return {
    retrieveSubscription: (id) => getStripe().subscriptions.retrieve(id),
    listSubscriptionItems: (subscription) => getStripe().subscriptionItems.list({ subscription, limit: 100 }).autoPagingToArray({ limit: 1000 }),
    listInvoiceLines: (invoiceId) => getStripe().invoices.listLineItems(invoiceId, { limit: 100 }).autoPagingToArray({ limit: 1000 }),
    retrieveInvoice: (id) => getStripe().invoices.retrieve(id),
    checkoutBusinessIds: async (subscription) => {
      const [session] = (await getStripe().checkout.sessions.list({ subscription, limit: 1 })).data;
      if (!session) return new Map();
      const lines = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 100 }).autoPagingToArray({ limit: 1000 });
      return new Map(lines.flatMap((l) => (l.price && l.metadata?.business_id ? [[l.price.id, l.metadata.business_id] as const] : [])));
    },
    tagItem: async (itemId, businessId) => {
      // Setting the same business_id twice changes nothing, so no idempotency key is needed.
      await getStripe().subscriptionItems.update(itemId, { metadata: { business_id: businessId } });
    },
    checkoutSessionForPaymentIntent: async (payment_intent) =>
      (await getStripe().checkout.sessions.list({ payment_intent, limit: 1 })).data[0] ?? null,
  };
}

function defaultDeps(): WebhookDeps {
  return { store: createWebhookStore(), stripe: stripeReader(), sendEmail: sendBillingEmail, now: () => new Date() };
}

/**
 * Verifies the signature on the raw body, claims the event (stripe_webhook_events, migration 056), runs the handler
 * and records the outcome. An event already handled returns 200; one another delivery is running now returns 409, so
 * Stripe sends it again later instead of both running at once. A failed handler returns 500 so Stripe retries; the
 * retry claims it again. Grants and emails also have their own unique keys.
 */
export async function processStripeWebhook(
  rawBody: string,
  signature: string | null,
  options: { secret?: string; deps?: WebhookDeps } = {},
): Promise<WebhookResult> {
  const secret = options.secret ?? env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return { status: 503, body: { error: "Webhook not configured." } };
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature ?? "", secret);
  } catch {
    return { status: 400, body: { error: "Invalid signature." } };
  }

  const deps = options.deps ?? defaultDeps();
  const claim = await deps.store.claimEvent(event.id, event.type, deps.now());
  if (claim === "done") return { status: 200, body: { received: true, duplicate: true } };
  if (claim === "busy") return { status: 409, body: { error: "This event is being processed." } };

  try {
    const outcome = await dispatchEvent(deps, event);
    await deps.store.recordEvent(event.id, event.type, null);
    return { status: 200, body: { received: true, outcome } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe/webhook] handler failed", event.type, event.id, message);
    await deps.store.recordEvent(event.id, event.type, message.slice(0, 1000));
    return { status: 500, body: { error: "Handler failed." } };
  }
}

/**
 * The webhook's checkout.session.completed handler, for a page that found a completed session itself because the
 * event is missed or late (checkout-recovery.ts). Every write in it is idempotent, so the event arriving later
 * changes nothing.
 */
export async function applyCompletedCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const event = { id: `recovered_${session.id}`, type: "checkout.session.completed", data: { object: session } };
  await dispatchEvent(defaultDeps(), event as unknown as Stripe.Event);
}

/**
 * Grants a subscription's latest invoice the way invoice.paid does, when that event is missed or late (A1). Nothing
 * happens while the invoice is unpaid, and a grant already made is never made again.
 */
export async function applyLatestInvoice(subscriptionId: string): Promise<void> {
  const deps = defaultDeps();
  const sub = await deps.stripe.retrieveSubscription(subscriptionId);
  const invoiceId = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
  if (!invoiceId) return;
  const invoice = await deps.stripe.retrieveInvoice(invoiceId);
  if (invoice.status !== "paid") return;
  const event = { id: `recovered_${invoice.id}`, type: "invoice.paid", data: { object: invoice } };
  await dispatchEvent(deps, event as unknown as Stripe.Event);
}

/**
 * Saves a subscription's current items the way customer.subscription.updated does. For a subscription whose items
 * were never linked to their businesses (started before BUG-104 was fixed, or a missed event): the Billing page
 * runs it when Stripe has an item the database does not (BUG-121). Idempotent like the webhook.
 */
export async function resyncSubscription(subscriptionId: string): Promise<void> {
  const deps = defaultDeps();
  const sub = await deps.stripe.retrieveSubscription(subscriptionId);
  const event = { id: `resync_${sub.id}`, type: "customer.subscription.updated", data: { object: sub } };
  await dispatchEvent(deps, event as unknown as Stripe.Event);
}


/**
 * Applies the subscription and its latest paid invoice from Stripe the way the webhooks do, for a page that cannot
 * wait for them ("Start my plan now", the plan checkout, 2026-10-15). Idempotent like the webhooks.
 */
export async function syncSubscriptionFromStripe(subscriptionId: string): Promise<StripeSync> {
  return syncFromStripe(defaultDeps(), subscriptionId);
}
