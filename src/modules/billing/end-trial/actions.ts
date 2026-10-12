"use server";

import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canAddBusiness } from "@/modules/entitlements";
import { billingAccess } from "../account/access";
import { loadPlanChangeData } from "../plan-change/dal";
import { PlanChangeError } from "../plan-change/planner";
import { startPlanNowInput } from "./schema";
import { DECLINED, endTrialNow, type PlanNowDone } from "./service";

// "Start my plan now" on the new-business plan page (D-16, MVP_SPEC 4.4). Each action checks auth and input itself;
// the agency always comes from the session. Nothing here marks the agency paid or grants credits: the Stripe
// webhook does both (MVP_SPEC 11.3), and the page polls getPlanNowStatus until it has.

const badInput = { ok: false, status: 400, error: "Something was wrong with that request. Refresh the page and try again." } as const;
const unavailable = {
  ok: false,
  status: 503,
  error: "Starting your plan early isn't available right now. Contact us and we'll start it for you.",
} as const;

function stripeFailure(error: unknown): ActionResult<never> | null {
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

/** Ends the trial now and charges the first month, so the agency can add more than the trial's businesses. */
export async function startPlanNow(input: unknown): Promise<ActionResult<PlanNowDone>> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = startPlanNowInput.safeParse(input);
  if (!parsed.success) return badInput;
  try {
    const data = await loadPlanChangeData(agency);
    const access = await billingAccess(data);
    if (!access) return unavailable;
    const deps = { stripe: access.stripe, plansByProduct: data.plansByProduct, now: () => new Date() };
    return { ok: true, data: await endTrialNow(access.context, parsed.data.attemptId, deps) };
  } catch (error) {
    if (error instanceof PlanChangeError) return { ok: false, status: error.status, error: error.message };
    const failure = stripeFailure(error);
    if (failure) return failure;
    throw error;
  }
}

/** Polled after startPlanNow: true once the webhook has saved the plan as active, so a new business is allowed. */
export async function getPlanNowStatus(): Promise<ActionResult<{ started: boolean }>> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  return { ok: true, data: { started: (await canAddBusiness(agency)).allowed } };
}
