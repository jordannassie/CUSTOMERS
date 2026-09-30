/**
 * POST /api/stripe/agency-program
 * Starts a $199/month Agency software subscription. Never created from the $97 kit.
 */
import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/geo/api-auth";
import { requireStripe } from "@/lib/stripe";
import { getOrCreateBillingAccount } from "@/lib/billing/accounts";
import {
  agencyProgramPriceId,
  AGENCY_PROGRAM_PRODUCT,
} from "@/modules/launch-kit/pricing";
import { getLaunchKitAccess } from "@/modules/launch-kit/dal";
import { appBaseUrl } from "@/modules/launch-kit/urls";

export async function POST(request: NextRequest) {
  const { user, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;

  const kit = await getLaunchKitAccess({ userId: user!.id, email: user!.email });
  if (!kit.launchKitPurchased) {
    return NextResponse.json(
      { error: "Activate Agency after you have the Launch Kit." },
      { status: 403 },
    );
  }

  const priceId = agencyProgramPriceId();
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "Agency software checkout is not configured yet. Add STRIPE_PRICE_AGENCY_MONTHLY.",
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

  let billingAccount: Awaited<ReturnType<typeof getOrCreateBillingAccount>> | null = null;
  try {
    billingAccount = await getOrCreateBillingAccount(user!.id);
  } catch {
    billingAccount = null;
  }

  const baseUrl = appBaseUrl(request);

  const sessionParams: Parameters<typeof stripeClient.checkout.sessions.create>[0] = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/agency/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/agency/activate?checkout=canceled`,
    allow_promotion_codes: true,
    metadata: {
      product: AGENCY_PROGRAM_PRODUCT,
      user_id: user!.id,
      email: user!.email ?? "",
    },
    subscription_data: {
      metadata: {
        product: AGENCY_PROGRAM_PRODUCT,
        user_id: user!.id,
        email: user!.email ?? "",
      },
    },
  };

  if (billingAccount?.stripe_customer_id) {
    sessionParams.customer = billingAccount.stripe_customer_id;
  } else {
    sessionParams.customer_email = user!.email ?? undefined;
  }

  const session = await stripeClient.checkout.sessions.create(sessionParams);
  if (!session.url) {
    return NextResponse.json({ error: "Checkout could not be created." }, { status: 502 });
  }
  return NextResponse.json({ url: session.url });
}
