import type Stripe from "stripe";
import type { WebhookAgency } from "./dal";
import type { WebhookDeps } from "./handlers";

// Top-up payments (B-43, MVP_SPEC 4.2, 11.5, D-57): the grant when Checkout is paid, and taking it back when the
// charge is refunded. Credits change only through the credit SQL functions, keyed by the session or refund ID.

const idOf = (ref: string | { id: string } | null | undefined) => (typeof ref === "string" ? ref : ref?.id ?? null);

export const isTopupSession = (session: Pick<Stripe.Checkout.Session, "mode" | "metadata">) =>
  session.mode === "payment" && session.metadata?.kind === "topup";

/**
 * The credits bought, from the session's own metadata (set when it was made, so a pack changed since then cannot
 * change what was paid for). Sessions made before `credits` was sent fall back to the pack's current credits.
 */
export async function topupCredits(deps: WebhookDeps, session: Stripe.Checkout.Session): Promise<number> {
  const raw = session.metadata?.credits;
  if (raw && /^[1-9]\d{0,6}$/.test(raw)) return Number(raw);
  if (raw) console.warn("[stripe/webhook] top-up credits metadata not a whole number, using the pack", session.id, raw);
  const packId = session.metadata?.topup_pack_id ?? "";
  const credits = await deps.store.topupCredits(packId);
  if (!credits) throw new Error(`checkout ${session.id}: unknown top-up pack ${packId}`);
  return credits;
}

/**
 * Grants a paid top-up (never expires, source_id = the session ID, so a replay grants once). This is the one place a
 * top-up's credits arrive, from the webhook, the fixture payment and the page's recovery alike.
 */
export async function grantTopup(deps: WebhookDeps, session: Stripe.Checkout.Session, agency: WebhookAgency): Promise<void> {
  const amount = await topupCredits(deps, session);
  await deps.store.grant({ agencyId: agency.id, source: "topup", sourceId: session.id, amount, expiresAt: null });
  // Scans skipped for lack of credits run now (M3). The credits are in either way, so a failure here is only logged:
  // the 02:00 run picks the scans up, and the event is never retried for it.
  try {
    const queued = await deps.store.queueSkippedScans(agency.id);
    if (queued > 0) console.info(`[stripe/webhook] top-up queued ${queued} skipped scan(s) for agency ${agency.id}`);
  } catch (error) {
    console.error("[stripe/webhook] could not queue skipped scans after a top-up", error instanceof Error ? error.message : String(error));
  }
}

/** The refund this event is for when the payload lists refunds (newest first), else the charge's refunded total. */
function refundKey(charge: Stripe.Charge): string {
  return charge.refunds?.data?.[0]?.id ?? `${charge.id}:${charge.amount_refunded}`;
}

/**
 * charge.refunded (M5, 2026-10-16): a refunded top-up loses the refunded share of its credits (refunded / charged x
 * the credits granted), never more than is left on it. Charges of anything other than a top-up Checkout are ignored.
 */
export async function chargeRefunded(deps: WebhookDeps, charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = idOf(charge.payment_intent);
  if (!paymentIntentId || charge.amount_refunded <= 0) return;
  const session = await deps.stripe.checkoutSessionForPaymentIntent(paymentIntentId);
  if (!session || !isTopupSession(session)) {
    console.info("[stripe/webhook] refund ignored: not a top-up", charge.id);
    return;
  }
  const agencyId = session.metadata?.agency_id ?? session.client_reference_id;
  const agency = await deps.store.findAgency({ agencyId, customerId: idOf(session.customer) ?? idOf(charge.customer) });
  if (!agency) throw new Error(`no agency for refunded top-up ${session.id}`);

  const result = await deps.store.refundTopupGrant({
    agencyId: agency.id,
    sourceId: session.id,
    refundId: refundKey(charge),
    refundedCents: charge.amount_refunded,
    chargeCents: charge.amount,
    chargeId: charge.id,
  });
  const log = result.status === "no_grant" || result.unrecovered > 0 ? console.warn : console.info;
  log("[stripe/webhook] top-up refund", agency.id, session.id, charge.id, result);
}
