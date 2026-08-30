/**
 * Stripe Webhook Handler — Customers.Direct.
 *
 * AUTHORITATIVE SOURCE OF TRUTH for all billing state.
 * Never trust browser-sent plan/pricing — all decisions made here from Stripe data.
 *
 * Account-level billing model:
 *   billing_accounts  → one per auth user (Stripe Customer)
 *   business_billing_items → one per business (Stripe Subscription Item)
 *
 * Idempotent: checks stripe_webhook_events table before processing.
 * Signature-verified: rejects any request without valid Stripe signature.
 *
 * Events handled:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   customer.updated
 *   invoice.created
 *   invoice.finalized
 *   invoice.paid
 *   invoice.payment_failed
 *   invoice.payment_action_required
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { getPlanIdFromStripePrice, type CanonicalPlanId } from "@/config/pricing";

// ─────────────────────────────────────────────────────────────────────────────
// Stripe field helpers (API version compatibility)
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function subPeriodStart(sub: any): number {
  return sub.current_period_start ?? sub.billing_cycle_anchor ?? Math.floor(Date.now() / 1000);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function subPeriodEnd(sub: any): number {
  return sub.current_period_end ?? sub.billing_cycle_anchor ?? Math.floor(Date.now() / 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Status mapping
// ─────────────────────────────────────────────────────────────────────────────

function mapSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "active":       return "active";
    case "trialing":     return "trialing";
    case "past_due":     return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default:
      return "inactive";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Idempotency check
// ─────────────────────────────────────────────────────────────────────────────

async function markEventProcessed(
  stripeEventId: string,
  eventType: string,
  error?: string
): Promise<void> {
  const svc = createServiceClient();
  await svc.from("stripe_webhook_events").upsert(
    { stripe_event_id: stripeEventId, event_type: eventType, error: error ?? null },
    { onConflict: "stripe_event_id", ignoreDuplicates: true }
  );
}

async function isEventAlreadyProcessed(stripeEventId: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data } = await svc
    .from("stripe_webhook_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();
  return !!data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core sync functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Syncs the billing_account from a Stripe Subscription.
 * Also syncs all business_billing_items for this subscription's items.
 */
async function syncSubscriptionToAccount(
  subscription: Stripe.Subscription,
  stripeClient: Stripe
): Promise<void> {
  const svc = createServiceClient();
  const meta = subscription.metadata as Record<string, string>;

  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const userId = meta.user_id ?? null;

  // Find or build billing account reference
  let billingAccountId: string | null = null;

  if (userId) {
    // Upsert billing_account for this user
    const { data: existing } = await svc
      .from("billing_accounts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const accountStatus = mapSubscriptionStatus(subscription.status);

    if (existing) {
      billingAccountId = existing.id;
      await svc.from("billing_accounts").update({
        stripe_customer_id:     stripeCustomerId,
        stripe_subscription_id: subscription.id,
        status:                 accountStatus,
        trial_started_at:       subscription.trial_start
          ? new Date(subscription.trial_start * 1000).toISOString()
          : null,
        trial_ends_at:          subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        current_period_start:   new Date(subPeriodStart(subscription) * 1000).toISOString(),
        current_period_end:     new Date(subPeriodEnd(subscription) * 1000).toISOString(),
        updated_at:             new Date().toISOString(),
      }).eq("user_id", userId);
    } else {
      const { data: created } = await svc
        .from("billing_accounts")
        .insert({
          user_id:                userId,
          stripe_customer_id:     stripeCustomerId,
          stripe_subscription_id: subscription.id,
          status:                 accountStatus,
          trial_started_at:       subscription.trial_start
            ? new Date(subscription.trial_start * 1000).toISOString()
            : null,
          trial_ends_at:          subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          current_period_start:   new Date(subPeriodStart(subscription) * 1000).toISOString(),
          current_period_end:     new Date(subPeriodEnd(subscription) * 1000).toISOString(),
        })
        .select("id")
        .single();
      billingAccountId = created?.id ?? null;
    }
  } else {
    // No user_id in metadata — look up by stripe_customer_id
    const { data: ba } = await svc
      .from("billing_accounts")
      .select("id, user_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();
    if (ba) {
      billingAccountId = ba.id;
      await svc.from("billing_accounts").update({
        stripe_subscription_id: subscription.id,
        status:                 mapSubscriptionStatus(subscription.status),
        current_period_start:   new Date(subPeriodStart(subscription) * 1000).toISOString(),
        current_period_end:     new Date(subPeriodEnd(subscription) * 1000).toISOString(),
        updated_at:             new Date().toISOString(),
      }).eq("id", billingAccountId);
    }
  }

  if (!billingAccountId) {
    console.error("[webhook] Could not find/create billing account for subscription", subscription.id);
    return;
  }

  // Sync each subscription item to a business_billing_item
  const itemStatus = mapSubscriptionStatus(subscription.status);
  for (const item of subscription.items.data) {
    const itemMeta = item.metadata as Record<string, string>;
    const subMeta = subscription.metadata as Record<string, string>;
    const businessId = itemMeta.business_id ?? subMeta.business_id ?? null;
    if (!businessId) {
      console.warn("[webhook] Subscription item missing business_id metadata", item.id);
      continue;
    }

    // Determine plan from price ID
    const priceId = typeof item.price === "string" ? item.price : item.price.id;
    const planId: CanonicalPlanId | null = getPlanIdFromStripePrice(priceId);
    const itemPlanId = planId ?? (meta.plan_id as CanonicalPlanId) ?? "starter";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemEnd = (item as any).current_period_end;
    const periodEnd = itemEnd
      ? new Date(itemEnd * 1000).toISOString()
      : new Date(subPeriodEnd(subscription) * 1000).toISOString();

    await svc.from("business_billing_items").upsert(
      {
        billing_account_id:          billingAccountId,
        business_id:                 businessId,
        plan_id:                     itemPlanId,
        stripe_subscription_item_id: item.id,
        status:                      itemStatus,
        price_monthly_cents:         item.price.unit_amount ?? null,
        current_period_end:          periodEnd,
        updated_at:                  new Date().toISOString(),
      },
      { onConflict: "business_id" }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main webhook handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  let stripe: Stripe;
  try {
    stripe = requireStripe();
  } catch {
    return NextResponse.json({ error: "Billing not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Idempotency: skip already-processed events
  if (await isEventAlreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  const svc = createServiceClient();

  try {
    switch (event.type) {

      // ── Checkout completed ────────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;

        const subscription = await stripe.subscriptions.retrieve(subId);

        // Merge session metadata into subscription metadata for full context
        subscription.metadata = { ...session.metadata, ...subscription.metadata };
        await syncSubscriptionToAccount(subscription, stripe);
        break;
      }

      // ── Subscription created/updated ──────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionToAccount(subscription, stripe);
        break;
      }

      // ── Subscription deleted ──────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // Mark billing account canceled
        await svc
          .from("billing_accounts")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);

        // Mark all business items for this account canceled
        const { data: ba } = await svc
          .from("billing_accounts")
          .select("id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();

        if (ba) {
          await svc
            .from("business_billing_items")
            .update({ status: "canceled", updated_at: new Date().toISOString() })
            .eq("billing_account_id", ba.id);
        }
        break;
      }

      // ── Invoice paid ──────────────────────────────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = (invoice as { subscription?: string | Stripe.Subscription | null }).subscription;
        if (!subRef) break;

        const subId = typeof subRef === "string" ? subRef : subRef.id;
        const subscription = await stripe.subscriptions.retrieve(subId);

        // Ensure billing account is marked active
        const stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        await svc
          .from("billing_accounts")
          .update({
            status: mapSubscriptionStatus(subscription.status),
            current_period_start: new Date(subPeriodStart(subscription) * 1000).toISOString(),
            current_period_end: new Date(subPeriodEnd(subscription) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", stripeCustomerId);

        // Update business items to active
        const { data: ba } = await svc
          .from("billing_accounts")
          .select("id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();

        if (ba) {
          await svc
            .from("business_billing_items")
            .update({
              status: "active",
              current_period_end: new Date(subPeriodEnd(subscription) * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("billing_account_id", ba.id)
            .neq("status", "canceled");
        }
        break;
      }

      // ── Invoice payment failed ────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = (invoice as { subscription?: string | Stripe.Subscription | null }).subscription;
        if (!subRef) break;

        const subId = typeof subRef === "string" ? subRef : subRef.id;
        const subscription = await stripe.subscriptions.retrieve(subId);
        const stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        await svc
          .from("billing_accounts")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", stripeCustomerId);

        const { data: ba } = await svc
          .from("billing_accounts")
          .select("id")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();

        if (ba) {
          await svc
            .from("business_billing_items")
            .update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("billing_account_id", ba.id)
            .neq("status", "canceled");
        }
        break;
      }

      // ── Invoice payment action required ───────────────────────────────────
      case "invoice.payment_action_required": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = (invoice as { subscription?: string | Stripe.Subscription | null }).subscription;
        if (!subRef) break;

        const subId = typeof subRef === "string" ? subRef : subRef.id;
        const subscription = await stripe.subscriptions.retrieve(subId);
        const stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        await svc
          .from("billing_accounts")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", stripeCustomerId);
        break;
      }

      // ── Customer updated ──────────────────────────────────────────────────
      case "customer.updated": {
        // Stripe customer email/details updated — no DB action needed
        break;
      }

      // ── Invoice created/finalized ─────────────────────────────────────────
      case "invoice.created":
      case "invoice.finalized":
        // Acknowledged, no action needed
        break;

      default:
        // Unhandled events are silently acknowledged
        break;
    }

    await markEventProcessed(event.id, event.type);
    return NextResponse.json({ received: true });

  } catch (err) {
    console.error("[stripe/webhook] Handler error for event", event.type, ":", err);
    await markEventProcessed(event.id, event.type, String(err));
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}
