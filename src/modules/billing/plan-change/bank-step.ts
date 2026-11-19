import "server-only";
import { env } from "@/lib/env";
import type { BillingAccess } from "../account/access";
import { abandonCharge, BANK_CONFIRM, BANK_NOT_CONFIRMED, isBankConfirmation, PaymentNeedsAction, type BankStep } from "./payment";
import type { BankOutcome } from "./schema";
import { syncAfterChange } from "./sync-after";

// The bank step of a charge made now (payment.ts, QA 2026-11-01): the action that started the charge hands the browser
// the payment to approve, and the browser calls the same action again with the outcome.

/** The bank step for the browser, or null when the error is something else. */
export function bankStepFor(error: unknown): BankStep | null {
  if (!(error instanceof PaymentNeedsAction)) return null;
  return { step: "authenticate", clientSecret: error.clientSecret, invoiceId: error.invoiceId, publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null };
}

/** The message for a card error that asked for the bank's confirmation, or null for any other error. */
export function bankFailure(error: unknown): { ok: false; status: 402; error: string } | null {
  if (!isBankConfirmation(error)) return null;
  const e = error as { code?: string; decline_code?: string };
  console.warn("[billing/payment] payment needs the bank's confirmation", e?.code, e?.decline_code);
  return { ok: false, status: 402, error: BANK_CONFIRM };
}

/**
 * Finishes the bank step on this agency's own subscription. Paid: Stripe applies the update once the payment goes
 * through; saved here at once like after any change (BUG-238). Not paid: the pending update is dropped by voiding its
 * invoice, only when that invoice is this subscription's. Credits still come only from the invoice.paid handlers.
 */
export async function finishBankStep(
  access: Pick<BillingAccess, "stripe" | "sync">,
  subscriptionId: string | null,
  outcome: BankOutcome,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!subscriptionId) return { ok: false, status: 409, error: "You don't have a plan yet. Finish checkout first." };
  if (outcome.paid) {
    await syncAfterChange(access, subscriptionId);
    return { ok: true };
  }
  const mine = await abandonCharge(access.stripe, subscriptionId, outcome.invoiceId).catch((error) => {
    console.error("[billing/payment] could not drop the pending change", error instanceof Error ? error.message : String(error));
    return true;
  });
  if (!mine) return { ok: false, status: 404, error: "That payment isn't on your plan." };
  return { ok: false, status: 402, error: BANK_NOT_CONFIRMED };
}
