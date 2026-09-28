"use server";

import { authFailure, requireAgency, type ActionResult } from "@/modules/auth";
import { canAddBusiness } from "@/modules/entitlements";
import { billingAccess } from "../account/access";
import { loadPlanChangeData } from "./dal";
import { PlanChangeError, type PlanChange } from "./planner";
import { businessPlanInput, removeBusinessInput, subscriptionInput } from "./schema";
import { applyPlanChange, previewPlanChange, type PlanChangeDone, type PlanChangePreview } from "./service";

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

async function run(
  agencyId: string,
  change: PlanChange,
  previewedAt: number | undefined,
): Promise<PlanChangeResult> {
  try {
    const data = await loadPlanChangeData(agencyId);
    const access = await billingAccess(data);
    if (!access) return unavailable;
    const { context, stripe } = access;
    const deps = { stripe, plansByProduct: data.plansByProduct, now: () => new Date() };
    if (previewedAt === undefined) {
      return { ok: true, data: { step: "preview", ...(await previewPlanChange(context, change, deps)) } };
    }
    return { ok: true, data: { step: "done", ...(await applyPlanChange(context, change, previewedAt, deps)) } };
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
  const { businessId, previewedAt } = parsed.data;
  return run(agency, { kind: "remove", businessId }, previewedAt);
}

/** Ends the plan at the end of the billing period. */
export async function cancelSubscription(input: unknown): Promise<PlanChangeResult> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = subscriptionInput.safeParse(input);
  if (!parsed.success) return badInput;
  return run(agency, { kind: "cancel" }, parsed.data.previewedAt);
}

/** Undoes a cancel before the period ends. */
export async function keepSubscription(input: unknown): Promise<PlanChangeResult> {
  const agency = await agencyId();
  if (typeof agency !== "string") return agency;
  const parsed = subscriptionInput.safeParse(input);
  if (!parsed.success) return badInput;
  return run(agency, { kind: "keep" }, parsed.data.previewedAt);
}
