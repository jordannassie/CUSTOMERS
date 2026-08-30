/**
 * POST /api/stripe/change-plan
 *
 * Changes the plan for a specific business.
 * Updates the Stripe Subscription Item price with proration.
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
    return NextResponse.json({ error: "Plan not available." }, { status: 503 });
  }

  // Verify business ownership
  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_user_id")
    .eq("id", businessId)
    .single();

  if (!business || business.owner_user_id !== user!.id) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const svc = createServiceClient();

  // Get the business billing item
  const { data: item } = await svc
    .from("business_billing_items")
    .select("stripe_subscription_item_id, plan_id, billing_account_id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!item?.stripe_subscription_item_id) {
    return NextResponse.json(
      { error: "No active subscription found for this business. Please subscribe first." },
      { status: 404 }
    );
  }

  let stripeClient: ReturnType<typeof requireStripe>;
  try {
    stripeClient = requireStripe();
  } catch {
    return NextResponse.json({ error: "Billing not configured." }, { status: 503 });
  }

  // Update the subscription item price with proration
  await stripeClient.subscriptionItems.update(item.stripe_subscription_item_id, {
    price: plan.stripePriceMonthly,
    proration_behavior: "create_prorations",
    metadata: {
      business_id: businessId,
      plan_id: planId,
      user_id: user!.id,
    },
  });

  // Optimistic DB update (webhook will confirm)
  await svc.from("business_billing_items").update({
    plan_id: planId,
    price_monthly_cents: plan.priceMonthly,
    updated_at: new Date().toISOString(),
  }).eq("business_id", businessId);

  return NextResponse.json({ success: true });
}
