import "server-only";
import { requireAgency } from "@/modules/auth";
import { getBalance, readCaptures, type CreditCapture } from "@/modules/credits";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MODEL_LABELS,
  forecast,
  forecastWindow,
  startOfMonthUtc,
  toModelKey,
  totalsBy,
  type Forecast,
  type ModelKey,
  type Schedule,
} from "./service";

const HISTORY_LIMIT = 25;
// Keeps each .in() filter well inside the URL length limit.
const ID_CHUNK = 200;

export type UsageReport = {
  balance: { total: number; plan: number; topup: number; held: number; overdraft: number };
  month: { startsAt: string; used: number };
  byBusiness: { id: string | null; name: string; credits: number }[];
  byModel: { model: ModelKey; label: string; credits: number }[];
  forecast: Omit<Forecast, "endsAt" | "runsOutAt"> & { endsAt: string; runsOutAt: string | null };
  scans: { id: string; businessName: string; status: string; at: string; credits: number }[];
};

/** The signed-in agency's usage. Pages pass next so a signed-out visitor goes to login. */
export async function getUsageReport(options: { next?: string } = {}): Promise<UsageReport> {
  const { agency } = await requireAgency(options);
  return loadUsageReport(agency.id, new Date());
}

// Callers check the user may see this agency first; every number comes from the ledger or the balance view.
export async function loadUsageReport(agencyId: string, now: Date): Promise<UsageReport> {
  const db = createServiceClient();
  const monthStart = startOfMonthUtc(now);

  const [balance, monthCaptures, agencyRow, businessRows, recentJobs] = await Promise.all([
    getBalance(agencyId),
    readCaptures(agencyId, { since: monthStart }),
    db.from("agencies").select("status, trial_ends_at, current_period_end").eq("id", agencyId).single(),
    db.from("businesses").select("id, name, status, scan_frequency, models, next_scan_at").eq("agency_id", agencyId),
    db
      .from("scan_jobs")
      .select("id, business_id, hold_id, status, created_at, finished_at")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT),
  ]);
  for (const r of [agencyRow, businessRows, recentJobs]) if (r.error) throw new Error(`Usage: ${r.error.message}`);
  const businesses = businessRows.data!;
  const names = new Map(businesses.map((b) => [b.id, b.name]));

  const [jobBusiness, providers, questionCounts, historyCaptures] = await Promise.all([
    businessOfHolds(unique(monthCaptures.map((c) => c.holdId))),
    providerOfChecks(unique(monthCaptures.map((c) => c.checkId))),
    activeQuestionCounts(businesses.map((b) => b.id)),
    readCaptures(agencyId, { holdIds: unique(recentJobs.data!.map((j) => j.hold_id)) }),
  ]);

  const byBusiness = totalsBy(monthCaptures, (c) => (c.holdId && jobBusiness.get(c.holdId)) || "", (c) => c.credits);
  const byModel = totalsBy(monthCaptures, (c) => toModelKey(providers.get(c.checkId)), (c) => c.credits);
  const perHold = new Map(totalsBy(historyCaptures, (c) => c.holdId ?? "", (c) => c.credits).map((t) => [t.key, t.credits]));

  const schedules: Schedule[] = businesses
    .filter((b) => b.status === "active" || b.status === "scanning")
    .map((b) => ({
      businessId: b.id,
      businessName: b.name,
      frequency: b.scan_frequency as Schedule["frequency"],
      nextScanAt: b.next_scan_at ? new Date(b.next_scan_at) : null,
      creditsPerScan: (questionCounts.get(b.id) ?? 0) * b.models.length,
    }));
  const agency = agencyRow.data!;
  const window = forecastWindow(
    {
      status: agency.status,
      trialEndsAt: agency.trial_ends_at ? new Date(agency.trial_ends_at) : null,
      periodEndsAt: agency.current_period_end ? new Date(agency.current_period_end) : null,
    },
    now,
  );
  const outlook = forecast(schedules, balance.balance ?? 0, window, now);

  return {
    balance: {
      total: balance.balance ?? 0,
      plan: balance.plan_remaining ?? 0,
      topup: balance.topup_remaining ?? 0,
      held: balance.held ?? 0,
      overdraft: balance.overdraft ?? 0,
    },
    month: { startsAt: monthStart.toISOString(), used: sum(monthCaptures) },
    byBusiness: byBusiness.map((t) => ({
      id: t.key || null,
      name: names.get(t.key) ?? "Deleted business",
      credits: t.credits,
    })),
    byModel: byModel.map((t) => ({ model: t.key as ModelKey, label: MODEL_LABELS[t.key as ModelKey], credits: t.credits })),
    forecast: { ...outlook, endsAt: outlook.endsAt.toISOString(), runsOutAt: outlook.runsOutAt?.toISOString() ?? null },
    scans: recentJobs.data!.map((j) => ({
      id: j.id,
      businessName: names.get(j.business_id) ?? "Deleted business",
      status: j.status,
      at: j.finished_at ?? j.created_at,
      credits: (j.hold_id && perHold.get(j.hold_id)) || 0,
    })),
  };
}

const sum = (captures: CreditCapture[]) => captures.reduce((total, c) => total + c.credits, 0);
const unique = (ids: (string | null)[]) => [...new Set(ids.filter((id): id is string => id !== null))];

async function inChunks<T>(ids: string[], load: (chunk: string[]) => Promise<T[]>, size = ID_CHUNK): Promise<T[]> {
  const chunks = Array.from({ length: Math.ceil(ids.length / size) }, (_, i) => ids.slice(i * size, (i + 1) * size));
  return (await Promise.all(chunks.map(load))).flat();
}

// hold -> business through the scan job that took the hold.
async function businessOfHolds(holdIds: string[]): Promise<Map<string, string>> {
  const rows = await inChunks(holdIds, async (chunk) => {
    const { data, error } = await createServiceClient().from("scan_jobs").select("hold_id, business_id").in("hold_id", chunk);
    if (error) throw new Error(`Usage: ${error.message}`);
    return data;
  });
  return new Map(rows.map((r) => [r.hold_id!, r.business_id]));
}

// A check's ledger key is its visibility_results row, which records the model that answered.
async function providerOfChecks(checkIds: string[]): Promise<Map<string, string>> {
  const rows = await inChunks(checkIds, async (chunk) => {
    const { data, error } = await createServiceClient().from("visibility_results").select("id, provider").in("id", chunk);
    if (error) throw new Error(`Usage: ${error.message}`);
    return data;
  });
  return new Map(rows.map((r) => [r.id, r.provider]));
}

async function activeQuestionCounts(businessIds: string[]): Promise<Map<string, number>> {
  // Small chunks: at up to 25 questions each, the rows stay under the 1,000-row response cap.
  const rows = await inChunks(businessIds, async (chunk) => {
    const { data, error } = await createServiceClient()
      .from("tracked_prompts")
      .select("business_id")
      .in("business_id", chunk)
      .eq("active", true);
    if (error) throw new Error(`Usage: ${error.message}`);
    return data;
  }, 30);
  return new Map(totalsBy(rows, (r) => r.business_id, () => 1).map((t) => [t.key, t.credits]));
}
