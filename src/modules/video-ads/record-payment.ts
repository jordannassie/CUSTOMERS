import "server-only";
import type Stripe from "stripe";
import { recordPaidOrder } from "./dal";
import { matchPaidPackage, type VideoAdPackageId } from "./packages";

/** Records a signature-verified Checkout payment. Subscription events never reach this. */
export async function recordVideoAdCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "video_ad") return;

  const pack = matchPaidPackage({
    mode: session.mode,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    kind: session.metadata.kind ?? null,
    packageId: session.metadata.package_id ?? null,
  });
  if (!pack) {
    console.error("[video-ads] signed checkout did not match a paid package", session.id);
    return;
  }

  const paymentIntent = session.payment_intent;
  await recordPaidOrder({
    sessionId: session.id,
    paymentIntentId: !paymentIntent ? null : typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id,
    packageId: pack.id as VideoAdPackageId,
    amountCents: pack.amountCents,
    email: session.customer_details?.email ?? session.customer_email ?? null,
    customerName: session.customer_details?.name ?? null,
  });
}
