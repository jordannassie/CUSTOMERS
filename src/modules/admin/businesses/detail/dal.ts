import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { getBalance } from "@/modules/credits";
import { allRows, emailsOf, readCaptures, unique } from "../dal";
import { isActive, startOfMonthUtc, sumBy, toScanState, type ScanState } from "../service";

// Everything about one business for the admin detail page (B-66); callers run requireAdmin() first.

const HISTORY_LIMIT = 20;

function must<T>(what: string, result: { data: T | null; error: { message: string } | null }): T | null {
  if (result.error) throw new Error(`Admin business: could not load ${what}: ${result.error.message}`);
  return result.data;
}

export type AdminScan = {
  id: string;
  state: ScanState;
  startedAt: string;
  finishedAt: string | null;
  priority: number | null;
  attempts: number | null;
  checks: number | null;
  checksFailed: number | null;
  credits: number;
  error: string | null;
};

export type AdminBusinessDetail = Awaited<ReturnType<typeof loadBusinessDetail>>;

export async function loadBusinessDetail(id: string, now = new Date()) {
  const db = createServiceClient();
  const { data: business, error } = await db
    .from("businesses")
    .select(
      "id, name, domain, phone, primary_city, primary_region, primary_country, industry, status, agency_id, owner_user_id, scan_frequency, models, next_scan_at, services, aliases, created_at, deleted_at, purge_after",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Admin business: could not load the business: ${error.message}`);
  if (!business) return null;

  const [agency, subscription, competitors, questions, jobs, oldRuns, opportunities] = await Promise.all([
    business.agency_id
      ? db
          .from("agencies")
          .select("id, name, owner_user_id, is_test, status")
          .eq("id", business.agency_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("business_subscriptions").select("status, plans(name)").eq("business_id", id).maybeSingle(),
    db.from("business_competitors").select("id, name, domain, city").eq("business_id", id).order("created_at"),
    db.from("tracked_prompts").select("id, prompt, active").eq("business_id", id).order("created_at"),
    allRows("scan jobs", (from, to) =>
      db
        .from("scan_jobs")
        .select("id, status, priority, attempts, hold_id, error, created_at, finished_at")
        .eq("business_id", id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    db
      .from("visibility_runs")
      .select("id, status, error, created_at, completed_at")
      .eq("business_id", id)
      .is("scan_job_id", null)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    db
      .from("opportunities")
      .select("id, title, impact, status, category")
      .eq("business_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const agencyRow = must("the agency", agency);
  const shown = jobs.slice(0, HISTORY_LIMIT);
  const lastDone = jobs.find((j) => j.status === "done");

  const [captures, runs, emails, balance] = await Promise.all([
    readCaptures({ holdIds: unique(jobs.map((j) => j.hold_id)) }),
    db
      .from("visibility_runs")
      .select("id, scan_job_id, checks_total, checks_failed")
      .in("scan_job_id", unique([...shown.map((j) => j.id), lastDone?.id ?? null])),
    emailsOf([agencyRow?.owner_user_id ?? business.owner_user_id]),
    agencyRow ? getBalance(agencyRow.id) : null,
  ]);
  const runOfJob = new Map((must("scan runs", runs) ?? []).map((r) => [r.scan_job_id!, r]));
  const creditsOfHold = sumBy(
    captures,
    (c) => c.holdId,
    (c) => c.credits,
  );
  const monthStart = startOfMonthUtc(now).toISOString();

  const scans: AdminScan[] = [
    ...shown.map((j) => {
      const run = runOfJob.get(j.id);
      return {
        id: j.id,
        state: toScanState(j.status),
        startedAt: j.created_at,
        finishedAt: j.finished_at,
        priority: j.priority,
        attempts: j.attempts,
        checks: run?.checks_total ?? null,
        checksFailed: run?.checks_failed ?? null,
        credits: (j.hold_id && creditsOfHold.get(j.hold_id)) || 0,
        error: j.error,
      };
    }),
    ...(must("old scan runs", oldRuns) ?? []).map((r) => ({
      id: r.id,
      state: toScanState(r.status),
      startedAt: r.created_at,
      finishedAt: r.completed_at,
      priority: null,
      attempts: null,
      checks: null,
      checksFailed: null,
      credits: 0,
      error: r.error,
    })),
  ]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, HISTORY_LIMIT);

  const ownerId = agencyRow?.owner_user_id ?? business.owner_user_id;
  const sub = must("the plan", subscription);
  return {
    business,
    ownerEmail: emails.get(ownerId) ?? null,
    agency: agencyRow
      ? {
          id: agencyRow.id,
          name: agencyRow.name,
          isTest: agencyRow.is_test,
          status: agencyRow.status,
        }
      : null,
    plan: sub ? { name: sub.plans?.name ?? null, status: sub.status } : null,
    balance: balance ? { total: balance.balance ?? 0, held: balance.held ?? 0 } : null,
    competitors: must("competitors", competitors) ?? [],
    questions: must("questions", questions) ?? [],
    opportunities: must("opportunities", opportunities) ?? [],
    scans,
    activeScan: jobs.some((j) => isActive(toScanState(j.status))),
    credits: {
      thisMonth: captures.filter((c) => c.createdAt >= monthStart).reduce((sum, c) => sum + c.credits, 0),
      allTime: captures.reduce((sum, c) => sum + c.credits, 0),
    },
    results: await latestResults(lastDone?.id, runOfJob),
  };
}

export type ResultRow = {
  question: string;
  mentioned: Partial<Record<string, boolean>>;
};

/** Per-question, per-model answers of the newest finished scan (B-26 results). */
async function latestResults(jobId: string | undefined, runOfJob: Map<string, { id: string }>) {
  const runId = jobId ? runOfJob.get(jobId)?.id : undefined;
  if (!runId) return null;
  const rows = await allRows("check results", (from, to) =>
    createServiceClient()
      .from("visibility_results")
      .select("id, question, provider, business_mentioned, created_at")
      .eq("run_id", runId)
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  const byQuestion = new Map<string, ResultRow>();
  for (const r of rows) {
    const question = r.question ?? "Question not recorded";
    const row = byQuestion.get(question) ?? { question, mentioned: {} };
    row.mentioned[r.provider] = r.business_mentioned;
    byQuestion.set(question, row);
  }
  return { at: rows[0]?.created_at ?? null, rows: [...byQuestion.values()] };
}
