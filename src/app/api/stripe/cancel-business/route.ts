/**
 * POST /api/stripe/cancel-business
 *
 * Cancels the paid subscription for a specific business.
 * Removes the business's Subscription Item from the account subscription.
 * Does NOT delete business data — only marks billing as canceled.
 *
 * If this was the last business in the subscription, the subscription
 * is left with no items and Stripe will handle it per account settings.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { getStripe } from "@/modules/billing";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { businessId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const businessId = typeof body.businessId === "string" ? body.businessId : null;
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  // Verify business ownership
  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_user_id, name")
    .eq("id", businessId)
    .single();

  if (!business || business.owner_user_id !== user!.id) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const svc = createServiceClient();

  const { data: item } = await svc
    .from("business_billing_items")
    .select("stripe_subscription_item_id, status")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!item?.stripe_subscription_item_id) {
    return NextResponse.json({ error: "No subscription found for this business." }, { status: 404 });
  }

  let stripeClient: ReturnType<typeof getStripe>;
  try {
    stripeClient = getStripe();
  } catch {
    return NextResponse.json({ error: "Billing not configured." }, { status: 503 });
  }

  // Remove this subscription item from Stripe (prorate to end of period)
  await stripeClient.subscriptionItems.del(item.stripe_subscription_item_id, {
    proration_behavior: "create_prorations",
  });

  return NextResponse.json({ success: true });
}
