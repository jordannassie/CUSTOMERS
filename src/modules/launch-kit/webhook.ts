import "server-only";
import Stripe from "stripe";
import {
  AGENCY_PROGRAM_PRODUCT,
  isAgencyProgramPrice,
  isLaunchKitPrice,
  LAUNCH_KIT_PRODUCT,
} from "./pricing";
import { recordLaunchKitPurchase, upsertAgencyProgramSubscription } from "./dal";

function meta(source: { metadata?: Stripe.Metadata | null }): Record<string, string> {
  return (source.metadata ?? {}) as Record<string, string>;
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function periodEnd(subscription: Stripe.Subscription): string | null {
  const raw = (subscription as unknown as { current_period_end?: number }).current_period_end;
  if (!raw) return null;
  return new Date(raw * 1000).toISOString();
}

function mapAgencyStatus(status: Stripe.Subscription.Status): string {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due") return "past_due";
  if (status === "unpaid") return "unpaid";
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  return "incomplete";
}

function priceIdsFromSubscription(subscription: Stripe.Subscription): string[] {
  return subscription.items.data.map((item) =>
    typeof item.price === "string" ? item.price : item.price.id,
  );
}

export function isLaunchKitSession(session: Stripe.Checkout.Session): boolean {
  const product = meta(session).product;
  if (product === LAUNCH_KIT_PRODUCT) return true;
  if (session.mode !== "payment") return false;
  const priceId = session.line_items?.data[0]?.price;
  const id = typeof priceId === "string" ? priceId : priceId?.id;
  return isLaunchKitPrice(id);
}

export function isAgencyProgramEvent(input: {
  product?: string;
  priceIds?: string[];
}): boolean {
  if (input.product === AGENCY_PROGRAM_PRODUCT) return true;
  return (input.priceIds ?? []).some((id) => isAgencyProgramPrice(id));
}

export async function applyLaunchKitCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const email = (
    session.customer_details?.email ??
    session.customer_email ??
    meta(session).email ??
    ""
  ).trim().toLowerCase();
  if (!email) return;

  const paymentIntent = session.payment_intent;
  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null;

  await recordLaunchKitPurchase({
    userId: meta(session).user_id || null,
    email,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripeCustomerId: customerId(session.customer),
    amountCents: session.amount_total ?? 9700,
  });
}

export async function applyAgencySubscription(
  subscription: Stripe.Subscription,
): Promise<boolean> {
  const data = meta(subscription);
  const prices = priceIdsFromSubscription(subscription);
  if (!isAgencyProgramEvent({ product: data.product, priceIds: prices })) {
    return false;
  }

  const userId = data.user_id;
  if (!userId) return true;

  await upsertAgencyProgramSubscription({
    userId,
    email: data.email ?? null,
    stripeCustomerId: customerId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    status: mapAgencyStatus(subscription.status),
    currentPeriodEnd: periodEnd(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
  });
  return true;
}

/**
 * Returns true when this Stripe event belongs to the Launch Kit / Agency
 * program funnel and should not update per-business billing_accounts.
 */
export async function handleLaunchFunnelEvent(
  event: Stripe.Event,
  stripe: Stripe,
): Promise<boolean> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment" && meta(session).product === LAUNCH_KIT_PRODUCT) {
        const full = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items"],
        });
        await applyLaunchKitCheckoutSession(full);
        return true;
      }
      if (session.mode === "subscription" && meta(session).product === AGENCY_PROGRAM_PRODUCT) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!subId) return true;
        const subscription = await stripe.subscriptions.retrieve(subId);
        subscription.metadata = { ...session.metadata, ...subscription.metadata };
        await applyAgencySubscription(subscription);
        return true;
      }
      return false;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      return applyAgencySubscription(subscription);
    }
    case "invoice.paid":
    case "invoice.payment_failed":
    case "invoice.payment_action_required": {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = (invoice as { subscription?: string | Stripe.Subscription | null }).subscription;
      if (!subRef) return false;
      const subId = typeof subRef === "string" ? subRef : subRef.id;
      const subscription = await stripe.subscriptions.retrieve(subId);
      return applyAgencySubscription(subscription);
    }
    default:
      return false;
  }
}
