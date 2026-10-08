import "server-only";
import type Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { matchPaidPackage, type VideoAdPackage } from "./packages";

export type PaidVideoAdSession = {
  pack: VideoAdPackage;
  email: string | null;
  customerName: string | null;
  paymentIntentId: string | null;
  briefToken: string | null;
};

export async function loadPaidVideoAdSession(
  sessionId: string,
): Promise<{ ok: true; session: PaidVideoAdSession } | { ok: false; reason: "not_found" | "unpaid" | "unavailable" }> {
  let stripe: Stripe;
  try {
    stripe = requireStripe();
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  let checkout: Stripe.Checkout.Session;
  try {
    checkout = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { ok: false, reason: "not_found" };
  }

  const pack = matchPaidPackage({
    mode: checkout.mode,
    paymentStatus: checkout.payment_status,
    amountTotal: checkout.amount_total,
    currency: checkout.currency,
    kind: checkout.metadata?.kind ?? null,
    packageId: checkout.metadata?.package_id ?? null,
  });
  if (!pack) return { ok: false, reason: "unpaid" };

  const paymentIntent = checkout.payment_intent;
  return {
    ok: true,
    session: {
      pack,
      email: checkout.customer_details?.email ?? checkout.customer_email ?? null,
      customerName: checkout.customer_details?.name ?? null,
      paymentIntentId: !paymentIntent ? null : typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id,
      briefToken: checkout.metadata?.brief_token ?? null,
    },
  };
}
