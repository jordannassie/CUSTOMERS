/**
 * POST /api/stripe/portal
 *
 * Opens the Stripe Billing Portal for the authenticated user's account.
 * Looks up the billing_account's stripe_customer_id — never accepts a
 * customer ID from the client.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { requireStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  let stripeClient: ReturnType<typeof requireStripe>;
  try {
    stripeClient = requireStripe();
  } catch {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const svc = createServiceClient();
  const { data: ba } = await svc
    .from("billing_accounts")
    .select("stripe_customer_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!ba?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing record found. Please subscribe first." },
      { status: 404 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const session = await stripeClient.billingPortal.sessions.create({
    customer: ba.stripe_customer_id,
    return_url: `${baseUrl}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
