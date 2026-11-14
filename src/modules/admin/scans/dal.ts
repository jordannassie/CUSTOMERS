import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { allRows, inChunks } from "../businesses/dal";
import { readPage } from "../paging";
import { explainScanError } from "./error-text";
import { SCAN_STATUSES, type ScanListQuery, type ScanStatus } from "./schema";
import { jobModels, partialNote, replacedBy, retryState, scanTiming } from "./service";

export { listScanFilterOptions, type ScanFilterOptions } from "./options/dal";

/** Scans a page; the list used to stop at the newest 100 with no way further back. */
export const SCAN_PAGE_SIZE = 50;
/** Kept for the "Showing the newest" note in older screens; the list is paged now. */
export const SCAN_LIST_LIMIT = SCAN_PAGE_SIZE;

export type AdminScanRow = {
  id: string;
  status: ScanStatus;
  businessId: string;
  businessName: string;
  agencyId: string | null;
  agencyName: string;
  isTest: boolean;
  models: string[];
  creditsCharged: number;
  /** Whether the scan got as far as a run. A skipped scan never does, so it has no cost or checks. */
  hasRun: boolean;
  /** What the AI tools charged us for it. Null when it has no run, or nothing was logged for it. */
  costUsd: number | null;
  durationMs: number | null;
  /** Set when the tries were spread out over this long (retries); the duration is then the last try's. */
  retriedOverMs: number | null;
  createdAt: string;
  attempts: number;
  error: string | null;
  /** A done scan with checks missing: "12 of 36 checks failed (Perplexity)." */
  note: string | null;
  canRetry: boolean;
  /** Why a failed or skipped scan has no Retry: a newer scan replaced it, or retrying cannot change the outcome. */
  retryNote: string | null;
  /** What running it again charges: the business's active questions times its models (one credit per check). */
  scanCredits: number;
};

export type AdminScanList = {
  rows: AdminScanRow[];
  /** Per status, with the date, agency and test filters applied. */
  counts: Record<ScanStatus | "all", number>;
  total: number;
  /** The page shown: the last one when the address asked for a page past the end. */
  page: number;
  pages: number;
  /** The agency filtered to, for the agency filter when it is not in the list. */
  agencyName: string | null;
  /** The business filtered to, even when it was deleted, for the business filter. */
  business: { name: string; deleted: boolean } | null;
};

type Filters = Omit<ScanListQuery, "status" | "page">;

const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString();

/** The date, agency and test filters on any scan_jobs query that embeds agencies (inner join when filtering on it). */
function filtered<Q extends { gte: (c: string, v: string) => Q; lt: (c: string, v: string) => Q; eq: (c: string, v: string | boolean) => Q }>(
  query: Q,
  f: Filters,
): Q {
  let q = query;
  if (f.from) q = q.gte("created_at", `${f.from}T00:00:00.000Z`);
  if (f.to) q = q.lt("created_at", nextDay(f.to));
  if (f.agency) q = q.eq("agency_id", f.agency);
  if (f.business) q = q.eq("business_id", f.business);
  if (f.test !== "all") q = q.eq("agencies.is_test", f.test === "test");
  return q;
}

/** One page of scan jobs, newest first, with filters, and what each cost us in AI calls. */
export async function listScanJobs(query: ScanListQuery): Promise<AdminScanList> {
  await requireAdmin();
  const db = createServiceClient();
  const { status, page, ...f } = query;
  // An inner join only when filtering on the agency's test flag: a job whose agency is gone still lists otherwise.
  const agencies = f.test === "all" ? "agencies(name, is_test)" : "agencies!inner(name, is_test)";
  // A fresh query for each read: readPage may read twice when the page is past the end.
  const pageOf = (from: number, to: number) => {
    let list = filtered(
      db
        .from("scan_jobs")
        .select(
          `id, status, business_id, agency_id, attempts, credits_charged, error, created_at, locked_at, finished_at, businesses(name, models, deleted_at), ${agencies}`,
          { count: "exact" },
        ),
      f,
    );
    if (status) list = list.eq("status", status);
    return list.order("created_at", { ascending: false }).order("id").range(from, to);
  };

  const [{ result: jobs, page: shown }, counts, agency, business] = await Promise.all([
    readPage(page, SCAN_PAGE_SIZE, pageOf),
    countByStatus(f),
    f.agency ? db.from("agencies").select("name").eq("id", f.agency).maybeSingle() : null,
    f.business ? db.from("businesses").select("name, deleted_at").eq("id", f.business).maybeSingle() : null,
  ]);
  if (jobs.error) throw new Error(`Scans: ${jobs.error.message}`);

  const stoppedJobs = jobs.data.filter((j) => j.status === "failed" || j.status === "skipped");
  const [runs, questions, cost, newest] = await Promise.all([
    runsOfJobs(jobs.data.map((j) => j.id)),
    activeQuestions([...new Set(jobs.data.map((j) => j.business_id))]),
    costOfJobs(jobs.data.map((j) => j.id)),
    newestScans([...new Set(stoppedJobs.map((j) => j.business_id))]),
  ]);
  const runByJob = new Map(runs.map((r) => [r.scan_job_id!, r]));

  const rows = jobs.data.map((j): AdminScanRow => {
    const run = runByJob.get(j.id);
    const timing = scanTiming({ runStart: run?.started_at ?? null, runEnd: run?.completed_at ?? null, lockedAt: j.locked_at, finishedAt: j.finished_at, hasRun: !!run });
    const stopped = j.status === "failed" || j.status === "skipped";
    const retry = retryState({
      status: j.status,
      error: j.error,
      businessDeleted: !j.businesses || j.businesses.deleted_at !== null,
      newer: stopped ? replacedBy(j.created_at, newest.newest.get(j.business_id), newest.active.get(j.business_id)) : null,
      blocked: stopped ? (explainScanError(j.error)?.noRetry ?? null) : null,
    });
    return {
      id: j.id,
      status: j.status as ScanStatus,
      businessId: j.business_id,
      businessName: j.businesses?.name ?? "Deleted business",
      agencyId: j.agencies ? j.agency_id : null,
      agencyName: j.agencies?.name ?? "",
      isTest: j.agencies?.is_test ?? false,
      models: jobModels(run?.provider ?? null, j.businesses?.models ?? []),
      creditsCharged: j.credits_charged,
      hasRun: !!run,
      costUsd: run ? (cost.get(j.id) ?? null) : null,
      ...timing,
      createdAt: j.created_at,
      attempts: j.attempts,
      error: j.error,
      note:
        j.status === "done" && run
          ? partialNote({ checksTotal: run.checks_total, checksFailed: run.checks_failed, failedByProvider: run.failed_by_provider, error: run.error })
          : null,
      ...retry,
      scanCredits: (questions.get(j.business_id) ?? 0) * (j.businesses?.models.length ?? 0),
    };
  });
  const total = jobs.count ?? 0;
  return {
    rows,
    counts,
    total,
    page: shown,
    pages: Math.max(1, Math.ceil(total / SCAN_PAGE_SIZE)),
    agencyName: agency?.data?.name ?? null,
    business: business?.data ? { name: business.data.name, deleted: business.data.deleted_at !== null } : null,
  };
}

async function countByStatus(f: Filters): Promise<AdminScanList["counts"]> {
  const db = createServiceClient();
  const agencies = f.test === "all" ? "id" : "id, agencies!inner(is_test)";
  const results = await Promise.all(
    SCAN_STATUSES.map((s) => filtered(db.from("scan_jobs").select(agencies, { count: "exact", head: true }), f).eq("status", s)),
  );
  const counts = { all: 0 } as AdminScanList["counts"];
  SCAN_STATUSES.forEach((s, i) => {
    const { count, error } = results[i];
    if (error) throw new Error(`Scans: ${error.message}`);
    counts[s] = count ?? 0;
    counts.all += count ?? 0;
  });
  return counts;
}

/** Active questions per business: a scan asks each one once per model. */
async function activeQuestions(businessIds: string[]): Promise<Map<string, number>> {
  const rows = await inChunks(businessIds, (chunk) =>
    allRows("questions", (from, to) =>
      createServiceClient()
        .from("tracked_prompts")
        .select("id, business_id")
        .in("business_id", chunk)
        .eq("active", true)
        .is("removed_at", null)
        .order("id")
        .range(from, to),
    ),
  );
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.business_id, (counts.get(r.business_id) ?? 0) + 1);
  return counts;
}

async function runsOfJobs(jobIds: string[]) {
  if (jobIds.length === 0) return [];
  const { data, error } = await createServiceClient()
    .from("visibility_runs")
    .select("id, scan_job_id, provider, started_at, completed_at, checks_total, checks_failed, failed_by_provider, error")
    .in("scan_job_id", jobIds);
  if (error) throw new Error(`Scans: ${error.message}`);
  return data;
}

// Real AI cost of each job from the usage log, the same source as Usage and cost and the Overview (migration 092), so
// the three pages agree. It includes the scan's other AI work (reading names, explanations), not only the checks.
// Migration 093: a scan with nothing logged has no cost (null), never $0.00.
async function costOfJobs(jobIds: string[]): Promise<Map<string, number>> {
  if (jobIds.length === 0) return new Map();
  const { data, error } = await createServiceClient().rpc("admin_scan_costs", { p_job_ids: jobIds });
  if (error) throw new Error(`Scans: ${error.message}`);
  const known = data.filter((r) => (r.cost_usd as number | null) !== null);
  return new Map(known.map((r) => [r.scan_job_id, Number(r.cost_usd)]));
}

/**
 * Each business's latest done, waiting or running scan, and its waiting or running one, to spot a failed or skipped
 * scan that another scan replaced. One small read per business (at most a page's worth), and one for the active jobs.
 */
async function newestScans(businessIds: string[]) {
  const db = createServiceClient();
  const [latest, active] = await Promise.all([
    Promise.all(
      businessIds.map((id) =>
        db
          .from("scan_jobs")
          .select("business_id, status, created_at")
          .eq("business_id", id)
          .in("status", ["done", "queued", "running"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    ),
    businessIds.length ? db.from("scan_jobs").select("business_id, status").in("business_id", businessIds).in("status", ["queued", "running"]) : null,
  ]);
  const newest = new Map<string, { status: string; createdAt: string }>();
  for (const { data, error } of latest) {
    if (error) throw new Error(`Scans: ${error.message}`);
    if (data) newest.set(data.business_id, { status: data.status, createdAt: data.created_at });
  }
  if (active?.error) throw new Error(`Scans: ${active.error.message}`);
  return { newest, active: new Map((active?.data ?? []).map((j) => [j.business_id, { status: j.status }])) };
}
