import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { getStripe } from "./stripe";
import { createWebhookStore } from "./webhooks/dal";
import { sendBillingEmail } from "./webhooks/emails";
import { dispatchEvent, type StripeReader, type WebhookDeps } from "./webhooks/handlers";

// Stripe webhook processing (B-42, MVP_SPEC 11.3, D-39). The only place billing state and plan credits come from.

export type WebhookResult = { status: number; body: Record<string, unknown> };

function stripeReader(): StripeReader {
  return {
    retrieveSubscription: (id) => getStripe().subscriptions.retrieve(id),
    listSubscriptionItems: (subscription) => getStripe().subscriptionItems.list({ subscription, limit: 100 }).autoPagingToArray({ limit: 1000 }),
    listInvoiceLines: (invoiceId) => getStripe().invoices.listLineItems(invoiceId, { limit: 100 }).autoPagingToArray({ limit: 1000 }),
  };
}

function defaultDeps(): WebhookDeps {
  return { store: createWebhookStore(), stripe: stripeReader(), sendEmail: sendBillingEmail, now: () => new Date() };
}

/**
 * Verifies the signature on the raw body, skips events already processed (stripe_webhook_events), runs the
 * handler and records the outcome. A failed handler returns 500 so Stripe retries; the retry runs it again.
 * Grants and emails have their own unique keys, so even two copies of one event running at once apply once.
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
  if ((await deps.store.eventState(event.id)) === "done") {
    return { status: 200, body: { received: true, duplicate: true } };
  }

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
