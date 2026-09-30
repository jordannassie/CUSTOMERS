import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";

// Typed wrappers over the credit SQL functions (B-13, MVP_SPEC 4.2). Credits never change any other way.

export type GrantSource = "plan" | "topup" | "trial" | "promo" | "refund";

export type CreditBalance = Pick<
  Database["public"]["Views"]["agency_credit_balance"]["Row"],
  "plan_remaining" | "topup_remaining" | "held" | "balance" | "overdraft"
>;

/** Raised by holdCredits when the balance is 0 or less (D-54). */
export class InsufficientCreditsError extends Error {
  constructor() {
    super("Not enough credits");
    this.name = "InsufficientCreditsError";
  }
}

function fail(fn: string, error: PostgrestError): never {
  if (error.message === "insufficient_credits") throw new InsufficientCreditsError();
  throw new Error(`${fn} failed: ${error.message}`);
}

/**
 * Reserves a scan's credits at start. Returns the hold ID; a retried job gets its first hold back.
 * Call entitlements canStartScan first: this spends any grant, top-ups included, whatever the agency status (F-20).
 */
export async function holdCredits(agencyId: string, amount: number, scanJobId: string): Promise<string> {
  const { data, error } = await createServiceClient().rpc("hold_credits", {
    p_agency_id: agencyId,
    p_amount: amount,
    p_scan_job_id: scanJobId,
  });
  if (error) fail("hold_credits", error);
  return data;
}

/** Charges 1 held credit for a successful check. False when that check was already charged. */
export async function captureCredit(holdId: string, checkId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("capture_credit", {
    p_hold_id: holdId,
    p_check_id: checkId,
  });
  if (error) fail("capture_credit", error);
  return data;
}

/** captureCredit for several checks of one hold, under one agency lock. Returns how many were newly charged. */
export async function captureCredits(holdId: string, checkIds: string[]): Promise<number> {
  const { data, error } = await createServiceClient().rpc("capture_credits", {
    p_hold_id: holdId,
    p_check_ids: checkIds,
  });
  if (error) fail("capture_credits", error);
  return data;
}

/** Returns every uncaptured credit and closes the hold. Returns how many credits came back. */
export async function releaseHold(holdId: string): Promise<number> {
  const { data, error } = await createServiceClient().rpc("release_hold", { p_hold_id: holdId });
  if (error) fail("release_hold", error);
  return data;
}

/** Whether a hold is still open; a closed hold takes no more captures. */
export async function isHoldOpen(holdId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().from("credit_holds").select("status").eq("id", holdId).single();
  if (error) fail("credit_holds", error);
  return data.status === "open";
}

/** Adds a grant, paying off any negative balance first. A replayed source returns the first grant's ID. */
export async function grantCredits(input: {
  agencyId: string;
  source: GrantSource;
  sourceId: string;
  amount: number;
  expiresAt: Date | null;
}): Promise<string> {
  const { data, error } = await createServiceClient().rpc("grant_credits", {
    p_agency_id: input.agencyId,
    p_source: input.source,
    p_source_id: input.sourceId,
    p_amount: input.amount,
    p_expires_at: input.expiresAt?.toISOString(),
  });
  if (error) fail("grant_credits", error);
  return data;
}

/**
 * The trial grant (MVP_SPEC 4.4). One per agency (F-43): returns null, granting nothing, when the agency already
 * had a trial. A replayed source returns the first grant's ID.
 */
export async function grantTrialCredits(input: { agencyId: string; sourceId: string; amount: number; expiresAt: Date }): Promise<string | null> {
  const { data, error } = await createServiceClient().rpc("grant_trial_credits", {
    p_agency_id: input.agencyId,
    p_source_id: input.sourceId,
    p_amount: input.amount,
    p_expires_at: input.expiresAt.toISOString(),
  });
  if (error) fail("grant_trial_credits", error);
  return data;
}

/** Zeroes every expired grant. Returns how many grants expired. */
export async function expireGrants(): Promise<number> {
  const { data, error } = await createServiceClient().rpc("expire_grants");
  if (error) fail("expire_grants", error);
  return data;
}

/** Adds or removes credits by hand. requestId is one uuid per submit, so a double submit applies once. */
export async function adminAdjustCredits(input: {
  agencyId: string;
  delta: number;
  adminUserId: string;
  note: string;
  requestId: string;
}): Promise<string> {
  const { data, error } = await createServiceClient().rpc("admin_adjust_credits", {
    p_agency_id: input.agencyId,
    p_delta: input.delta,
    p_admin_user_id: input.adminUserId,
    p_note: input.note,
    p_request_id: input.requestId,
  });
  if (error) fail("admin_adjust_credits", error);
  return data;
}

export async function readBalance(agencyId: string): Promise<CreditBalance> {
  const { data, error } = await createServiceClient()
    .from("agency_credit_balance")
    .select("plan_remaining, topup_remaining, held, balance, overdraft")
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (error) fail("agency_credit_balance", error);
  return data ?? { plan_remaining: 0, topup_remaining: 0, held: 0, balance: 0, overdraft: 0 };
}

/** This period's plan and trial grants, for "620 of 1,200 credits used". Top-ups and promos are not counted. */
export async function readPeriodGrants(agencyId: string): Promise<{ amount: number; remaining: number }> {
  const { data, error } = await createServiceClient()
    .from("credit_grants")
    .select("amount, remaining")
    .eq("agency_id", agencyId)
    .in("source", ["plan", "trial"])
    .gt("expires_at", new Date().toISOString());
  if (error) fail("credit_grants", error);
  return data.reduce((sum, row) => ({ amount: sum.amount + row.amount, remaining: sum.remaining + row.remaining }), {
    amount: 0,
    remaining: 0,
  });
}

export type CreditCapture = { holdId: string | null; checkId: string; credits: number; createdAt: string };

const PAGE = 1000;

/** Credits spent on checks, from the ledger. Filter by time, by hold, or both. */
export async function readCaptures(
  agencyId: string,
  filter: { since?: Date; holdIds?: string[] },
): Promise<CreditCapture[]> {
  if (filter.holdIds?.length === 0) return [];
  const rows: CreditCapture[] = [];
  // PostgREST caps a response at 1,000 rows, and a busy month has more checks than that.
  for (let from = 0; ; from += PAGE) {
    let query = createServiceClient()
      .from("credit_transactions")
      .select("id, hold_id, source_id, delta, created_at")
      .eq("agency_id", agencyId)
      .eq("kind", "capture");
    if (filter.since) query = query.gte("created_at", filter.since.toISOString());
    if (filter.holdIds) query = query.in("hold_id", filter.holdIds);
    const { data, error } = await query.order("created_at").order("id").range(from, from + PAGE - 1);
    if (error) fail("credit_transactions", error);
    for (const row of data) {
      rows.push({ holdId: row.hold_id, checkId: row.source_id, credits: -row.delta, createdAt: row.created_at });
    }
    if (data.length < PAGE) return rows;
  }
}
