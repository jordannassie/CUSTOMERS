/**
 * POST /api/stripe/launch-kit
 * Creates a one-time $97 Checkout session for the AI Business Launch Kit.
 * Auth is optional so a visitor can pay first, then create an Academy login.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { launchKitPriceId, LAUNCH_KIT_PRODUCT } from "@/modules/launch-kit/pricing";
import { appBaseUrl } from "@/modules/launch-kit/urls";

export async function POST(request: NextRequest) {
  const priceId = launchKitPriceId();
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "The Launch Kit is not available for checkout yet. Add STRIPE_PRICE_LAUNCH_KIT and try again.",
      },
      { status: 503 },
    );
  }

  let stripeClient;
  try {
    stripeClient = requireStripe();
  } catch {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const baseUrl = appBaseUrl(request);
  const session = await stripeClient.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/start-ai-business/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/start-ai-business?checkout=canceled`,
    allow_promotion_codes: true,
    customer_email: user?.email ?? undefined,
    client_reference_id: user?.id,
    metadata: {
      product: LAUNCH_KIT_PRODUCT,
      user_id: user?.id ?? "",
      email: user?.email ?? "",
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Checkout could not be created." }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
