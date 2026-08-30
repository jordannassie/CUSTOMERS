/**
 * POST /api/stripe/checkout
 *
 * Initiates a Stripe Checkout session for a business plan subscription.
 *
 * Account-level billing model:
 *   - One Stripe Customer per auth user account
 *   - One Stripe Subscription per account
 *   - One Stripe Subscription Item per paid business
 *
 * New user:
 *   Creates Stripe Checkout with 14-day trial, card required.
 *   Webhook creates billing_account + business_billing_item on success.
 *
 * Existing paid account adding first paid business:
 *   Creates a new Checkout session (Stripe will add to the subscription via webhook).
 *
 * Returns: { url: string } — redirect to Stripe Checkout.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { requireStripe } from "@/lib/stripe";
import {
  CANONICAL_PLANS,
  TRIAL_CONFIG,
  type CanonicalPlanId,
  SELF_SERVE_PLAN_IDS,
} from "@/config/pricing";
import { getOrCreateBillingAccount } from "@/lib/billing/accounts";

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
    return NextResponse.json(
      { error: "Invalid plan. Please choose Starter, Growth, or Pro." },
      { status: 400 }
    );
  }

  const plan = CANONICAL_PLANS[planId as CanonicalPlanId];
  if (!plan.stripePriceMonthly) {
    return NextResponse.json(
      { error: "This plan is not yet available for checkout. Please contact us." },
      { status: 503 }
    );
  }

  // Verify user owns this business
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id, name, owner_user_id")
    .eq("id", businessId)
    .single();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }
  if (business.owner_user_id !== user!.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Check if this business already has an active paid subscription item
  const { data: existingItem } = await supabase
    .from("business_billing_items")
    .select("status, plan_id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (existingItem?.status === "active") {
    return NextResponse.json(
      { error: "This business already has an active subscription. Use Change Plan to update it." },
      { status: 409 }
    );
  }

  let stripeClient: ReturnType<typeof requireStripe>;
  try {
    stripeClient = requireStripe();
  } catch {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  // Get or create the billing account for this user
  const billingAccount = await getOrCreateBillingAccount(user!.id);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const sessionParams: Parameters<typeof stripeClient.checkout.sessions.create>[0] = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceMonthly, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/billing?checkout=success`,
    cancel_url: `${baseUrl}/dashboard/billing`,
    allow_promotion_codes: true,
    metadata: {
      business_id: businessId,
      plan_id: planId,
      user_id: user!.id,
    },
    subscription_data: {
      trial_period_days: TRIAL_CONFIG.trialDays,
      metadata: {
        business_id: businessId,
        plan_id: planId,
        user_id: user!.id,
        billing_account_id: billingAccount.id,
      },
    },
  };

  // Reuse existing Stripe customer if this account already has one
  if (billingAccount.stripe_customer_id) {
    sessionParams.customer = billingAccount.stripe_customer_id;
    // Existing paying customers do NOT get a trial
    if (
      billingAccount.status === "active" ||
      (billingAccount.status !== "trialing" && billingAccount.stripe_subscription_id)
    ) {
      delete sessionParams.subscription_data!.trial_period_days;
    }
  } else {
    sessionParams.customer_email = user!.email ?? undefined;
  }

  const session = await stripeClient.checkout.sessions.create(sessionParams);
  return NextResponse.json({ url: session.url });
}
