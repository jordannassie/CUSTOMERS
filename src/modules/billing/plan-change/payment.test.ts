import { describe, expect, it, vi } from "vitest";
import { bankFailure, bankStepFor, finishBankStep } from "./bank-step";
import { BANK_CONFIRM, BANK_NOT_CONFIRMED, isBankConfirmation, PaymentNeedsAction } from "./payment";
import { pendingFor } from "./pending";
import type { PlanChange } from "./planner";
import { A, B, planOf, setup } from "./scenario.test-helpers";
import { applyPlanChange, previewPlanChange } from "./service";

// 3D Secure on a charge made now (QA 2026-11-01): the card that needs the bank's confirmation (4000 0025 0000 3155)
// read as "Your card was declined" and could never be approved. On the in-memory Stripe, which follows what the
// Stripe sandbox did with pending_if_incomplete.

const upgradeA: PlanChange = { kind: "upgrade", businessId: A, planId: "pro" };

async function needsBank() {
  const s = setup();
  const preview = await previewPlanChange(s.ctx, upgradeA, s.deps);
  s.stripe.requireActionNextCharge = true;
  const error = await applyPlanChange(s.ctx, upgradeA, preview.previewedAt, s.deps).catch((e: unknown) => e);
  return { ...s, error };
}

describe("an upgrade whose payment needs the bank's confirmation", () => {
  it("changes nothing yet and hands the browser the payment to approve", async () => {
    const { stripe, error } = await needsBank();
    expect(error).toBeInstanceOf(PaymentNeedsAction);
    const step = bankStepFor(error)!;
    expect(step).toMatchObject({ step: "authenticate", invoiceId: stripe.invoices[0].id });
    expect(step.clientSecret).toMatch(/^pi_.+_secret_/);
    expect(planOf(stripe, A)).toBe("cd_plan_starter");
    expect(stripe.invoices.map((i) => i.status)).toEqual(["open"]);
  });

  it("applies the change once the bank approves, and saves it from Stripe", async () => {
    const { stripe, ctx, error } = await needsBank();
    stripe.approvePending();
    expect(planOf(stripe, A)).toBe("cd_plan_pro");
    const sync = vi.fn(async () => ({}) as never);
    const invoiceId = (error as PaymentNeedsAction).invoiceId;
    expect(await finishBankStep({ stripe, sync }, ctx.subscriptionId, { invoiceId, paid: true })).toEqual({ ok: true });
    expect(sync).toHaveBeenCalledWith(ctx.subscriptionId);
  });

  it("drops the change when the bank's window is closed, and refuses another subscription's invoice", async () => {
    const { stripe, ctx, error } = await needsBank();
    const invoiceId = (error as PaymentNeedsAction).invoiceId;
    const sync = vi.fn();
    expect(await finishBankStep({ stripe, sync }, "sub_someone_else", { invoiceId, paid: false })).toMatchObject({ ok: false, status: 404 });
    expect(stripe.invoices.map((i) => i.status)).toEqual(["open"]);

    expect(await finishBankStep({ stripe, sync }, ctx.subscriptionId, { invoiceId, paid: false })).toEqual({
      ok: false,
      status: 402,
      error: BANK_NOT_CONFIRMED,
    });
    expect(stripe.invoices.map((i) => i.status)).toEqual(["void"]);
    expect(() => stripe.approvePending()).toThrow();
    expect(planOf(stripe, A)).toBe("cd_plan_starter");
  });

  it("with a downgrade pending, drops the payment, keeps the downgrade, and says the bank must confirm", async () => {
    const s = setup({ a: "price_pro" });
    await s.change({ kind: "downgrade", businessId: A, planId: "starter" });
    const upgradeB: PlanChange = { kind: "upgrade", businessId: B, planId: "pro" };
    const preview = await previewPlanChange(s.ctx, upgradeB, s.deps);
    s.stripe.requireActionNextCharge = true;

    const error = await applyPlanChange(s.ctx, upgradeB, preview.previewedAt, s.deps).catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(PaymentNeedsAction);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(bankFailure(error)).toEqual({ ok: false, status: 402, error: BANK_CONFIRM });
    expect(planOf(s.stripe, B)).toBe("cd_plan_starter");
    expect(s.stripe.invoices.filter((i) => i.amount_due > 0).map((i) => i.status)).toEqual(["void"]);
    expect(pendingFor(s.stripe.scheduleObject(), A)).toBe("plan");
  });
});

describe("isBankConfirmation", () => {
  it("tells a bank confirmation from a decline", () => {
    expect(isBankConfirmation({ type: "StripeCardError", code: "subscription_payment_intent_requires_action" })).toBe(true);
    expect(isBankConfirmation({ type: "StripeCardError", code: "card_declined", decline_code: "authentication_required" })).toBe(true);
    expect(isBankConfirmation({ type: "StripeCardError", payment_intent: { status: "requires_action" } })).toBe(true);
    expect(isBankConfirmation({ type: "StripeCardError", code: "card_declined", decline_code: "generic_decline" })).toBe(false);
    expect(isBankConfirmation(null)).toBe(false);
  });
});
