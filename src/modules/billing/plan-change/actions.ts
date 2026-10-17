"use server";

import { viewerTimeZone } from "@/lib/viewer-time-zone";
import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { getBalance } from "@/modules/credits";
import { canAddBusiness } from "@/modules/entitlements";
import { billingAccess } from "../account/access";
import { loadPlanChangeData, raiseScheduleLost, saveCancelReason } from "./dal";
import { PlanChangeError, type PlanChange } from "./planner";
import { businessPlanInput, cancelInput, keepBusinessInput, removeBusinessInput, subscriptionInput, type CancelReason } from "./schema";
import { applyPlanChange, previewPlanChange, type PlanChangeDone, type PlanChangePreview } from "./service";
import { syncAfterChange } from "./sync-after";

// Plan changes (B-44, MVP_SPEC 11.5, D-57). Each action checks auth and input itself. Called without
// previewedAt it returns the price effect to confirm; called again with the preview's previewedAt it applies.

export type PlanChangeResult = ActionResult<
  ({ step: "preview" } & PlanChangePreview) | ({ step: "done" } & PlanChangeDone)
>;

const badInput = { ok: false, status: 400, error: "Check your choice and try again." } as const;
const unavailable = {
  ok: false,
  status: 503,
  error: "Plan changes aren't available right now. Contact us and we'll make the change for you.",
} as const;

function stripeFailure(error: unknown): PlanChangeResult | null {
  const e = error as { type?: string; statusCode?: number };
  if (e?.type === "StripeCardError" || e?.statusCode === 402) {
    return { ok: false, status: 402, error: "Your card was declined, so nothing changed. Update your card and try again." };
  }
  if (typeof e?.type === "string" && e.type.startsWith("Stripe")) {
    console.error("[billing/plan-change] Stripe error", e.type, e.statusCode);
    return { ok: false, status: 502, error: "We couldn't reach our payment provider. Nothing changed. Try again in a minute." };
  }
  return null;
}

/** Credits left now, so the cancel and removal previews can say how many end (plan or trial) and how many stay. */
async function creditsLeft(agencyId: string) {
  const balance = await getBalance(agencyId);
  return { plan: Math.max(0, balance.plan_remaining ?? 0), topup: Math.max(0, balance.topup_remaining ?? 0) };
}

/** Never fails the cancel itself: the reason is optional, and the plan change already happened. */
async function keepReason(agencyId: string, change: PlanChange, reason: CancelReason | undefined) {
  if (!reason || (change.kind !== "cancel" && change.kind !== "remove")) return;
  try {
    await saveCancelReason(agencyId, { kind: change.kind, reason, businessId: change.kind === "remove" ? change.businessId : null });
  } catch (error) {
    console.error("[billing/plan-change] cancel reason not saved", error);
  }
}

async function run(
  agencyId: string,
  change: PlanChange,
  previewedAt: number | undefined,
  reason?: CancelReason,
): Promise<PlanChangeResult> {
  try {
    const data = await loadPlanChangeData(agencyId);
    const access = await billingAccess(data);
    if (!access) return unavailable;
    const { context, stripe } = access;
    const ending = change.kind === "cancel" || change.kind === "remove";
    const deps = {
      stripe,
      plansByProduct: data.plansByProduct,
      now: () => new Date(),
      timeZone: await viewerTimeZone(),
      credits: ending && previewedAt === undefined ? await creditsLeft(agencyId) : undefined,
      onScheduleLost: raiseScheduleLost,
    };
    if (previewedAt === undefined) {
      return { ok: true, data: { step: "preview", ...(await previewPlanChange(context, change, deps)) } };
    }
    const done = await applyPlanChange(context, change, previewedAt, deps);
    // The page refreshes next: it must show the new plan, not wait for the webhook (BUG-238).
    await syncAfterChange(access, context.subscriptionId);
    await keepReason(agencyId, change, reason);
    return { ok: true, data: { step: "done", ...done } };
  } catch (error) {
    if (error instanceof PlanChangeError) return { ok: false, status: error.status, error: error.message };
    const failure = stripeFailure(error);
    if (failure) return failure;
    throw error;
  }
}

async function agencyId(): Promise<string | PlanChangeResult> {
  try {
    return (await requireAgency()).agency.id;
  } catch (error) {
    return authFailure(error);
  }
}

/** Moves a business to a dearer plan now; the prorated difference is charged at once. */
export async function upgradeBusiness(input: unknown): Promise<PlanChangeResult> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = businessPlanInput.safeParse(input);
  if (!parsed.success) return badInput;
  const { businessId, planId, previewedAt } = parsed.data;
  return run(agency, { kind: "upgrade", businessId, planId }, previewedAt);
}

/** Puts a saved business on the plan now, with a prorated charge. */
export async function addBusiness(input: unknown): Promise<PlanChangeResult> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = businessPlanInput.safeParse(input);
  if (!parsed.success) return badInput;
  const allowed = await canAddBusiness(agency, { alreadySaved: true });
  if (!allowed.allowed) return { ok: false, status: 403, error: allowed.reason };
  const { businessId, planId, previewedAt } = parsed.data;
  return run(agency, { kind: "add", businessId, planId }, previewedAt);
}

/** Moves a business to a cheaper plan at the end of the billing period. */
export async function downgradeBusiness(input: unknown): Promise<PlanChangeResult> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = businessPlanInput.safeParse(input);
  if (!parsed.success) return badInput;
  const { businessId, planId, previewedAt } = parsed.data;
  return run(agency, { kind: "downgrade", businessId, planId }, previewedAt);
}

/** Takes a business off the plan at the end of the billing period. */
export async function removeBusiness(input: unknown): Promise<PlanChangeResult> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = removeBusinessInput.safeParse(input);
  if (!parsed.success) return badInput;
  const { businessId, previewedAt, reason } = parsed.data;
  return run(agency, { kind: "remove", businessId }, previewedAt, reason);
}

/** Takes back a scheduled downgrade or removal of one business ("Keep Pro", "Keep on plan"). */
export async function keepBusinessPlan(input: unknown): Promise<PlanChangeResult> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = keepBusinessInput.safeParse(input);
  if (!parsed.success) return badInput;
  const { businessId, previewedAt } = parsed.data;
  return run(agency, { kind: "keepBusiness", businessId }, previewedAt);
}

/** Ends the plan at the end of the billing period. */
export async function cancelSubscription(input: unknown): Promise<PlanChangeResult> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = cancelInput.safeParse(input);
  if (!parsed.success) return badInput;
  return run(agency, { kind: "cancel" }, parsed.data.previewedAt, parsed.data.reason);
}

/** Undoes a cancel before the period ends. */
export async function keepSubscription(input: unknown): Promise<PlanChangeResult> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = subscriptionInput.safeParse(input);
  if (!parsed.success) return badInput;
  return run(agency, { kind: "keep" }, parsed.data.previewedAt);
}
