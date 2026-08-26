/**
 * Stripe webhook handler.
 *
 * Events handled (idempotent upserts):
 *   checkout.session.completed        → creates/links subscription row
 *   customer.subscription.created     → sets plan + active status
 *   customer.subscription.updated     → syncs plan + status changes
 *   customer.subscription.deleted     → marks subscription canceled
 *   invoice.payment_failed            → marks subscription past_due
 *
 * Uses the service role key to write outside RLS (webhooks are server-to-server).
 * Never trusts client-supplied plan state — all plan info comes from Stripe metadata.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import type { PlanId } from "@/lib/plans";

/** Maps Stripe subscription status to our subscription status values */
function mapStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "inactive";
  }
}

/** Upserts subscription row using service role (bypasses RLS intentionally) */
async function syncSubscription(subscription: Stripe.Subscription) {
  const meta = subscription.metadata as {
    business_id?: string;
    plan_id?: string;
    user_id?: string;
  };

  const businessId = meta.business_id;
  const planId = (meta.plan_id ?? "ai_visibility") as PlanId;

  if (!businessId) {
    console.error("[stripe/webhook] subscription missing business_id metadata", subscription.id);
    return;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("subscriptions").upsert(
    {
      business_id: businessId,
      stripe_customer_id:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      plan: planId,
      status: mapStatus(subscription.status),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );

  if (error) {
    console.error("[stripe/webhook] upsert failed", error.message);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set — rejecting");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  let stripeClient: Stripe;
  try {
    stripeClient = requireStripe();
  } catch {
    return NextResponse.json({ error: "Billing not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        // Fetch the full subscription to get metadata + status
        const subscription = await stripeClient.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id,
        );

        // Merge session metadata into subscription (in case it's missing)
        const mergedMeta = { ...session.metadata, ...subscription.metadata };
        subscription.metadata = mergedMeta;
        await syncSubscription(subscription);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.business_id;
        if (!businessId) break;

        const supabase = createServiceClient();
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("business_id", businessId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subRef = invoice.subscription;
        if (!subRef) break;

        const subscription = await stripeClient.subscriptions.retrieve(
          typeof subRef === "string" ? subRef : subRef.id,
        );

        const businessId = subscription.metadata?.business_id;
        if (!businessId) break;

        const supabase = createServiceClient();
        await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("business_id", businessId);
        break;
      }

      default:
        // Unhandled event types are silently acknowledged
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
