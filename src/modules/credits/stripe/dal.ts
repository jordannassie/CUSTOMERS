import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { fail } from "../dal";

// Credit functions only the Stripe webhook calls (2026-10-16, migration 070): trial and renewal ends, and refunded
// top-ups. Like every credit change, they run in SQL under the agency lock.

/** Whether the agency has trial credits left that last past this trial end (so endTrialGrant has work to do). */
export async function hasTrialGrantAfter(agencyId: string, trialEnd: Date): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("credit_grants")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("source", "trial")
    .gt("remaining", 0)
    .gt("expires_at", trialEnd.toISOString())
    .limit(1);
  if (error) fail("credit_grants", error);
  return data.length > 0;
}

/**
 * Plan and trial grants run a few hours past their period end so a late renewal never leaves 0 credits (M6). Once
 * the new period's invoice is paid, this ends the previous period's grants (expiring by periodStart + grace) at once.
 * Returns the credits removed.
 */
export async function endPreviousPeriodGrants(agencyId: string, periodStart: Date, graceMs: number): Promise<number> {
  const { data, error } = await createServiceClient().rpc("end_previous_period_grants", {
    p_agency_id: agencyId,
    p_period_start: periodStart.toISOString(),
    p_grace_seconds: Math.round(graceMs / 1000),
  });
  if (error) fail("end_previous_period_grants", error);
  return data;
}

export type TopupRefundResult = { status: "refunded" | "duplicate" | "no_grant"; credits: number; removed: number; unrecovered: number };

/**
 * Takes a refunded top-up's share of credits back (M5). `refundedCents` is the charge's total refunded so far, so a
 * replay or an out of order refund never removes more than the refunded share, and never more than is left: spent
 * credits stay spent and are raised as an admin alert. Idempotent by refundId.
 */
export async function refundTopupGrant(input: {
  agencyId: string;
  sourceId: string;
  refundId: string;
  refundedCents: number;
  chargeCents: number;
  chargeId: string;
}): Promise<TopupRefundResult> {
  const { data, error } = await createServiceClient().rpc("refund_topup_grant", {
    p_agency_id: input.agencyId,
    p_source_id: input.sourceId,
    p_refund_id: input.refundId,
    p_refunded_cents: input.refundedCents,
    p_charge_cents: input.chargeCents,
    p_charge_id: input.chargeId,
  });
  if (error) fail("refund_topup_grant", error);
  return data as TopupRefundResult;
}
