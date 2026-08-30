/**
 * POST /api/stripe/add-business
 *
 * Adds a paid business to an existing account subscription.
 * Adds a new Stripe Subscription Item to the account's existing subscription.
 * Uses Stripe prorations for mid-cycle additions.
 *
 * Requires: existing active billing_account with stripe_subscription_id.
 * Returns: { url: string } — redirect to Stripe Checkout if no subscription exists,
 *          or { success: true } on direct subscription item add.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { requireStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { CANONICAL_PLANS, SELF_SERVE_PLAN_IDS, type CanonicalPlanId } from "@/config/pricing";

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { planId?: unknown; businessId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const planId = typeof body.planId === "string" ? body.planId : null;
  const businessId = typeof body.businessId === "string" ? body.businessId : null;

  if (!planId || !businessId) {
    return NextResponse.json({ error: "planId and businessId are required." }, { status: 400 });
  }

  if (!SELF_SERVE_PLAN_IDS.includes(planId as CanonicalPlanId)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const plan = CANONICAL_PLANS[planId as CanonicalPlanId];
  if (!plan.stripePriceMonthly) {
    return NextResponse.json({ error: "Plan not available for checkout." }, { status: 503 });
  }

  // Verify ownership
  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_user_id, name")
    .eq("id", businessId)
    .single();

  if (!business || business.owner_user_id !== user!.id) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const svc = createServiceClient();

  // Get billing account
  const { data: ba } = await svc
    .from("billing_accounts")
    .select("id, stripe_customer_id, stripe_subscription_id, status")
    .eq("user_id", user!.id)
    .maybeSingle();

  // If no active subscription — redirect to checkout (creates subscription)
  if (!ba?.stripe_subscription_id || ba.status === "none" || ba.status === "canceled") {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Fall through to checkout flow (no trial for additional businesses)
    return NextResponse.json({
      redirectToCheckout: true,
      checkoutHref: `/dashboard/billing/checkout?plan=${planId}&business=${businessId}`,
    });
  }

  let stripeClient: ReturnType<typeof requireStripe>;
  try {
    stripeClient = requireStripe();
  } catch {
    return NextResponse.json({ error: "Billing not configured." }, { status: 503 });
  }

  // Add a new subscription item to the existing subscription (prorated)
  const newItem = await stripeClient.subscriptionItems.create({
    subscription: ba.stripe_subscription_id,
    price: plan.stripePriceMonthly,
    quantity: 1,
    metadata: {
      business_id: businessId,
      plan_id: planId,
      user_id: user!.id,
    },
    proration_behavior: "create_prorations",
  });

  // Persist immediately (webhook will also sync, but we update optimistically)
  await svc.from("business_billing_items").upsert(
    {
      billing_account_id:          ba.id,
      business_id:                 businessId,
      plan_id:                     planId,
      stripe_subscription_item_id: newItem.id,
      status:                      ba.status === "active" ? "active" : "trialing",
      price_monthly_cents:         plan.priceMonthly,
      updated_at:                  new Date().toISOString(),
    },
    { onConflict: "business_id" }
  );

  return NextResponse.json({ success: true });
}
