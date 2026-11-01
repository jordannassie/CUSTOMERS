import type Stripe from "stripe";
import type { PlanChangeStripe } from "./client";

// Charges made now (an upgrade, an added business, "Start my plan now") and 3D Secure (QA 2026-11-01). With
// payment_behavior error_if_incomplete, Stripe answered a card that needs the bank's confirmation with a 402 card error
// and undid the update, so the app said "Your card was declined" and the payment could never be approved. With
// pending_if_incomplete the update waits on its invoice: paid at once, it applies as before; a bank confirmation hands
// the browser the payment to approve (Stripe applies the update once it is paid); a decline leaves the invoice open, and
// voiding it drops the update. Checked in the Stripe sandbox (API 2026-08-26.dahlia).

/** The subscription update params for a charge made now. */
export const CHARGE_NOW = {
  payment_behavior: "pending_if_incomplete",
  expand: ["latest_invoice.confirmation_secret"],
} as const satisfies Pick<Stripe.SubscriptionUpdateParams, "payment_behavior" | "expand">;

export const BANK_CONFIRM = "Your bank needs to confirm this payment. Nothing was charged. Try again and approve it in the window that opens.";

/** The bank's confirmation window was closed or failed: the pending change was dropped. */
export const BANK_NOT_CONFIRMED = "Your bank didn't confirm the payment, so nothing was charged and nothing changed. Try again, or update your card.";

/** The browser's next step: approve the payment with the bank, then report back with the invoice id. */
export type BankStep = { step: "authenticate"; clientSecret: string; invoiceId: string; publishableKey: string | null };

/** Thrown when the payment needs the bank's confirmation; the actions turn it into a BankStep. */
export class PaymentNeedsAction extends Error {
  constructor(
    readonly clientSecret: string,
    readonly invoiceId: string,
  ) {
    super("payment needs the bank's confirmation");
  }
}

const NEEDS_ACTION = new Set(["requires_action", "requires_confirmation"]);
const BANK_CODES = new Set(["subscription_payment_intent_requires_action", "invoice_payment_intent_requires_action", "authentication_required", "payment_intent_action_required"]);

/** A card error that asks for the bank's confirmation (3D Secure), not a decline. */
export function isBankConfirmation(error: unknown): boolean {
  if (error instanceof PaymentNeedsAction) return true;
  const e = error as { code?: string; decline_code?: string; payment_intent?: { status?: string } } | null;
  return BANK_CODES.has(e?.code ?? "") || BANK_CODES.has(e?.decline_code ?? "") || NEEDS_ACTION.has(e?.payment_intent?.status ?? "");
}

const cardError = (message: string, code?: string) => Object.assign(new Error(message), { type: "StripeCardError", statusCode: 402, code });

async function voidQuietly(stripe: PlanChangeStripe, invoiceId: string, key: string) {
  try {
    if (!stripe.voidInvoice) throw new Error("this Stripe client can't void invoices");
    await stripe.voidInvoice(invoiceId, `${key}:void`);
  } catch (error) {
    // The update still expires on its own within a day, never applied while unpaid.
    console.error("[billing/payment] could not void the pending invoice", invoiceId, error instanceof Error ? error.message : String(error));
  }
}

/**
 * After a CHARGE_NOW update. Returns when it was paid and applied. Throws PaymentNeedsAction when the bank must
 * confirm (with `bankStep` false, as where a schedule was released first, the invoice is voided and a bank card error
 * thrown instead), or a card error after voiding a declined payment's invoice, so callers treat it as before.
 */
export async function settleCharge(stripe: PlanChangeStripe, updated: Stripe.Subscription, key: string, bankStep = true): Promise<void> {
  if (!updated.pending_update) return;
  const latest = updated.latest_invoice;
  const invoice = typeof latest === "string" ? ((await stripe.retrieveInvoice?.(latest)) ?? null) : latest;
  if (!invoice?.id) throw cardError("Your card was declined.");
  const secret = invoice.confirmation_secret?.client_secret ?? null;
  const intent = secret ? ((await stripe.retrievePaymentIntent?.(secret.split("_secret_")[0])) ?? null) : null;
  if (secret && intent && NEEDS_ACTION.has(intent.status)) {
    if (bankStep) throw new PaymentNeedsAction(secret, invoice.id);
    await voidQuietly(stripe, invoice.id, key);
    throw cardError(BANK_CONFIRM, "subscription_payment_intent_requires_action");
  }
  await voidQuietly(stripe, invoice.id, key);
  throw cardError("Your card was declined.");
}

/** Drops a pending update the user did not approve: voids its invoice when it is this subscription's and still open. */
export async function abandonCharge(stripe: PlanChangeStripe, subscriptionId: string, invoiceId: string): Promise<boolean> {
  const invoice = await stripe.retrieveInvoice?.(invoiceId);
  if (!invoice) return false;
  const parent = invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details?.subscription : null;
  const owner = typeof parent === "string" ? parent : (parent?.id ?? null);
  if (owner !== subscriptionId) return false;
  if (invoice.status === "open") await voidQuietly(stripe, invoiceId, `abandon:${invoiceId}`);
  return true;
}
