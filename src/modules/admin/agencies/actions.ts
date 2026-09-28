"use server";

import { refresh } from "next/cache";
import { authFailure, requireAdmin, type ActionResult, type SessionUser } from "@/modules/auth";
import { adminAdjustCredits } from "@/modules/credits";
import { logAdminAction } from "../dal";
import { changeStatus, readAgencyState, setTestFlag, setTrialEnd, statusBeforeSuspend, type AgencyState } from "./dal";
import { adjustCreditsInput, extendTrialInput, markTestInput, reasonInput } from "./schema";
import { canRestore, extendedTrialEnd, isBillingStatus, statusAfterUnsuspend } from "./service";
import { adminStripeClient } from "./stripe";

// Agency actions (B-65, MVP_SPEC 9.1). Each checks admin access itself, needs a reason and writes the audit log.

type Done = ActionResult<{ done: true }>;
type Ready = { ok: true; admin: SessionUser; state: AgencyState } | { ok: false; status: number; error: string };

const BAD_INPUT = { ok: false, status: 400, error: "Fill in every field, including a reason of at least 3 characters." } as const;
const NOT_FOUND = { ok: false, status: 404, error: "Agency not found." } as const;
const CHANGED = { ok: false, status: 409, error: "This agency changed while you were looking. Refresh and try again." } as const;
const DONE = { ok: true, data: { done: true } } as const;

async function ready(agencyId: string): Promise<Ready> {
  const admin = await requireAdmin();
  const state = await readAgencyState(agencyId);
  return state ? { ok: true, admin, state } : NOT_FOUND;
}

async function finish(action: string, agencyId: string, details: Record<string, string | number | boolean | null>) {
  await logAdminAction(action, { type: "agency", id: agencyId }, details);
  refresh();
}

export async function adjustCredits(input: unknown): Promise<ActionResult<{ transactionId: string }>> {
  try {
    const parsed = adjustCreditsInput.safeParse(input);
    if (!parsed.success) return BAD_INPUT;
    const { agencyId, delta, reason, requestId } = parsed.data;
    const r = await ready(agencyId);
    if (!r.ok) return r;
    if (r.state.status === "deleted") return { ok: false, status: 409, error: "Restore this agency before changing its credits." };

    // The SQL function is the only way credits change (MVP_SPEC 4); removals it cannot cover become overdraft.
    const transactionId = await adminAdjustCredits({ agencyId, delta, adminUserId: r.admin.id, note: reason, requestId });
    await finish("agency.adjust_credits", agencyId, { reason, delta, request_id: requestId, transaction_id: transactionId });
    return { ok: true, data: { transactionId } };
  } catch (error) {
    return authFailure(error);
  }
}

export async function extendTrial(input: unknown): Promise<ActionResult<{ trialEndsAt: string }>> {
  try {
    const parsed = extendTrialInput.safeParse(input);
    if (!parsed.success) return BAD_INPUT;
    const { agencyId, days, reason } = parsed.data;
    const r = await ready(agencyId);
    if (!r.ok) return r;
    if (r.state.status !== "trialing") return { ok: false, status: 409, error: "Only an agency on a trial can have it extended." };
    if (!r.state.subscriptionId) {
      return { ok: false, status: 409, error: "This trial has no Stripe subscription yet, so there is nothing to extend." };
    }
    const stripe = adminStripeClient();
    if (!stripe) return { ok: false, status: 503, error: "Stripe is not connected, so trials cannot be changed here yet." };

    const trialEnd = extendedTrialEnd(r.state.trialEndsAt, days);
    try {
      await stripe.extendTrial(r.state.subscriptionId, trialEnd);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      return { ok: false, status: 502, error: `Stripe did not accept the change, so nothing was saved. Stripe said: ${message}` };
    }
    await setTrialEnd(agencyId, trialEnd);
    await finish("agency.extend_trial", agencyId, {
      reason,
      days,
      previous_trial_end: r.state.trialEndsAt,
      new_trial_end: trialEnd.toISOString(),
      stripe_mode: stripe.mode,
    });
    return { ok: true, data: { trialEndsAt: trialEnd.toISOString() } };
  } catch (error) {
    return authFailure(error);
  }
}

export async function suspendAgency(input: unknown): Promise<Done> {
  try {
    const parsed = reasonInput.safeParse(input);
    if (!parsed.success) return BAD_INPUT;
    const { agencyId, reason } = parsed.data;
    const r = await ready(agencyId);
    if (!r.ok) return r;
    if (!isBillingStatus(r.state.status)) return { ok: false, status: 409, error: "This agency is already suspended or deleted." };

    if (!(await changeStatus(agencyId, r.state.status, "suspended"))) return CHANGED;
    await finish("agency.suspend", agencyId, { reason, previous_status: r.state.status });
    return DONE;
  } catch (error) {
    return authFailure(error);
  }
}

export async function unsuspendAgency(input: unknown): Promise<Done> {
  try {
    const parsed = reasonInput.safeParse(input);
    if (!parsed.success) return BAD_INPUT;
    const { agencyId, reason } = parsed.data;
    const r = await ready(agencyId);
    if (!r.ok) return r;
    if (r.state.status !== "suspended") return { ok: false, status: 409, error: "This agency is not suspended." };

    const next = statusAfterUnsuspend(await statusBeforeSuspend(agencyId));
    if (!(await changeStatus(agencyId, "suspended", next))) return CHANGED;
    await finish("agency.unsuspend", agencyId, { reason, new_status: next });
    return DONE;
  } catch (error) {
    return authFailure(error);
  }
}

export async function restoreAgency(input: unknown): Promise<Done> {
  try {
    const parsed = reasonInput.safeParse(input);
    if (!parsed.success) return BAD_INPUT;
    const { agencyId, reason } = parsed.data;
    const r = await ready(agencyId);
    if (!r.ok) return r;
    if (!canRestore(r.state.status, r.state.deletedAt)) {
      return { ok: false, status: 409, error: "Only an account deleted in the last 30 days can be restored." };
    }

    // Deleting cancels the Stripe subscription (MVP_SPEC 23), so a restored agency starts as canceled and picks a plan again.
    if (!(await changeStatus(agencyId, "deleted", "canceled", true))) return CHANGED;
    await finish("agency.restore", agencyId, { reason, deleted_at: r.state.deletedAt, new_status: "canceled" });
    return DONE;
  } catch (error) {
    return authFailure(error);
  }
}

export async function markAgencyTest(input: unknown): Promise<Done> {
  try {
    const parsed = markTestInput.safeParse(input);
    if (!parsed.success) return BAD_INPUT;
    const { agencyId, reason, isTest } = parsed.data;
    const r = await ready(agencyId);
    if (!r.ok) return r;
    if (r.state.isTest === isTest) return { ok: false, status: 409, error: isTest ? "Already a test agency." : "Already a real agency." };

    await setTestFlag(agencyId, isTest);
    await finish("agency.mark_test", agencyId, { reason, is_test: isTest });
    return DONE;
  } catch (error) {
    return authFailure(error);
  }
}
