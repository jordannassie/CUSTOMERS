"use server";

import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canAddBusiness } from "@/modules/entitlements";
import { billingAccess } from "../account/access";
import { loadPlanChangeData, raiseScheduleLost } from "../plan-change/dal";
import { bankFailure, bankStepFor, finishBankStep } from "../plan-change/bank-step";
import type { BankStep } from "../plan-change/payment";
import { PlanChangeError } from "../plan-change/planner";
import { startPlanNowInput } from "./schema";
import { DECLINED, endTrialNow, type PlanNowDone } from "./service";

// "Start my plan now" on the new-business plan page (D-16, MVP_SPEC 4.4). Each action checks auth and input itself;
// the agency always comes from the session. The agency is marked paid and credited only from what Stripe says,
// through the webhook's own handlers: when the webhook comes, or when these actions read Stripe back (A1, 2026-10-15).

const badInput = { ok: false, status: 400, error: "Something was wrong with that request. Refresh the page and try again." } as const;
const unavailable = {
  ok: false,
  status: 503,
  error: "Starting your plan early isn't available right now. Contact us and we'll start it for you.",
} as const;

function stripeFailure(error: unknown): ActionResult<never> | null {
  // A card that needs the bank's confirmation (3D Secure) was not declined (QA 2026-11-01).
  const bank = bankFailure(error);
  if (bank) return bank;
  const e = error as { type?: string; statusCode?: number };
  if (e?.type === "StripeCardError" || e?.statusCode === 402) return { ok: false, status: 402, error: DECLINED };
  if (typeof e?.type === "string" && e.type.startsWith("Stripe")) {
    console.error("[billing/end-trial] Stripe error", e.type, e.statusCode);
    return { ok: false, status: 502, error: "We couldn't reach our payment provider, so nothing was charged. Try again in a minute." };
  }
  return null;
}

async function agencyId(): Promise<string | ActionResult<never>> {
  try {
    return (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
}

/**
 * Ends the trial now and charges the first month, so the agency can add more than the trial's businesses. A card that
 * needs the bank's confirmation gets a BankStep; the page then waits for the plan (paid) or calls again with the
 * outcome (not paid), which drops the pending change.
 */
export async function startPlanNow(input: unknown): Promise<ActionResult<PlanNowDone | BankStep>> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = startPlanNowInput.safeParse(input);
  if (!parsed.success) return badInput;
  try {
    const data = await loadPlanChangeData(agency);
    const access = await billingAccess(data);
    if (!access) return unavailable;
    if (parsed.data.bankStep) {
      const finished = await finishBankStep(access, access.context.subscriptionId, parsed.data.bankStep);
      return finished.ok ? { ok: true, data: { alreadyActive: false, started: false } } : finished;
    }
    const deps = { stripe: access.stripe, plansByProduct: data.plansByProduct, now: () => new Date(), sync: access.sync, onScheduleLost: raiseScheduleLost };
    return { ok: true, data: await endTrialNow(access.context, parsed.data.attemptId, deps) };
  } catch (error) {
    if (error instanceof PlanChangeError) return { ok: false, status: error.status, error: error.message };
    const step = bankStepFor(error);
    if (step) return { ok: true, data: step };
    const failure = stripeFailure(error);
    if (failure) return failure;
    throw error;
  }
}

/**
 * Polled after startPlanNow, and run by "Check again": true once the plan is saved as active, so a new business is
 * allowed. Until then each call reads the subscription back from Stripe and applies it like the webhook would.
 */
export async function getPlanNowStatus(): Promise<ActionResult<{ started: boolean }>> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  if ((await canAddBusiness(agency)).allowed) return { ok: true, data: { started: true } };
  try {
    const data = await loadPlanChangeData(agency);
    const access = await billingAccess(data);
    if (access && data.context.subscriptionId) await access.sync(data.context.subscriptionId);
  } catch (error) {
    // The next check tries again; the screen keeps waiting instead of showing an error.
    console.error("[billing/end-trial] sync from Stripe failed", error instanceof Error ? error.message : String(error));
  }
  return { ok: true, data: { started: (await canAddBusiness(agency)).allowed } };
}
