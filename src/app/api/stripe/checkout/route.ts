import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { requireStripe } from "@/lib/stripe";
import { PLANS, type PlanId } from "@/lib/plans";

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { planId?: unknown; businessId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const planId = typeof body.planId === "string" ? (body.planId as PlanId) : null;
  const businessId = typeof body.businessId === "string" ? body.businessId : null;

  if (!planId || !businessId) {
    return NextResponse.json({ error: "planId and businessId are required." }, { status: 400 });
  }

  const plan = PLANS[planId];
  if (!plan || !plan.stripePriceId) {
    return NextResponse.json(
      { error: "This plan is not available for self-serve checkout. Please contact us." },
      { status: 400 },
    );
  }

  // Verify the user owns this business via RLS
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .single();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  let stripeClient: ReturnType<typeof requireStripe>;
  try {
    stripeClient = requireStripe();
  } catch {
    return NextResponse.json(
      { error: "Billing is not configured on this server." },
      { status: 503 },
    );
  }

  // Look up existing Stripe customer ID (if any prior checkout)
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, status")
    .eq("business_id", businessId)
    .maybeSingle();

  // If already subscribed and active, redirect to portal instead
  if (existingSub?.status === "active" && existingSub.stripe_subscription_id) {
    return NextResponse.json(
      { error: "This business already has an active subscription. Use the billing portal to manage it." },
      { status: 409 },
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    // Reuse existing Stripe customer if available
    ...(existingSub?.stripe_customer_id
      ? { customer: existingSub.stripe_customer_id }
      : { customer_email: user!.email ?? undefined }),
    success_url: `${baseUrl}/dashboard/settings?checkout=success`,
    cancel_url: `${baseUrl}/pricing`,
    // Pass business context through metadata for webhook
    metadata: {
      business_id: businessId,
      plan_id: planId,
      user_id: user!.id,
    },
    subscription_data: {
      metadata: {
        business_id: businessId,
        plan_id: planId,
        user_id: user!.id,
      },
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
