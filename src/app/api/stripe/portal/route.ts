import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { requireStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let body: { businessId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine
  }

  const businessId = typeof body.businessId === "string" ? body.businessId : null;
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 });
  }

  // Verify ownership via RLS + look up subscription
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, status")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not load subscription." }, { status: 500 });
  }

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing record found. Please subscribe first." },
      { status: 404 },
    );
  }

  // Verify business ownership (RLS would have blocked the select above if no access)
  // Extra explicit ownership check for defense in depth
  const { data: business } = await supabase
    .from("businesses")
    .select("owner_user_id")
    .eq("id", businessId)
    .single();

  if (!business || business.owner_user_id !== user!.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const session = await stripeClient.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${baseUrl}/dashboard/settings`,
  });

  return NextResponse.json({ url: session.url });
}
