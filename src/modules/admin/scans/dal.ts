import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { SCAN_STATUSES, type ScanStatus } from "./schema";
import { durationMs, jobModels, sumBy } from "./service";

export const SCAN_LIST_LIMIT = 100;
// visibility_results has one row per check; a page of 100 jobs stays well under this many IDs per query.
const RUN_CHUNK = 100;
const PAGE = 1000;

export type AdminScanRow = {
  id: string;
  status: ScanStatus;
  businessId: string;
  businessName: string;
  agencyName: string;
  isTest: boolean;
  models: string[];
  creditsCharged: number;
  costUsd: number | null;
  durationMs: number | null;
  createdAt: string;
  attempts: number;
  error: string | null;
};

export type AdminScanList = {
  rows: AdminScanRow[];
  counts: Record<ScanStatus | "all", number>;
};

/** Newest scan jobs first, optionally one status only, with what each cost us in AI calls. */
export async function listScanJobs(status: ScanStatus | undefined): Promise<AdminScanList> {
  await requireAdmin();
  const db = createServiceClient();

  let query = db
    .from("scan_jobs")
    .select(
      "id, status, business_id, attempts, credits_charged, error, created_at, locked_at, finished_at, businesses(name, models), agencies(name, is_test)",
    )
    .order("created_at", { ascending: false })
    .limit(SCAN_LIST_LIMIT);
  if (status) query = query.eq("status", status);

  const [jobs, counts] = await Promise.all([query, countByStatus()]);
  if (jobs.error) throw new Error(`Scans: ${jobs.error.message}`);

  const runs = await runsOfJobs(jobs.data.map((j) => j.id));
  const cost = await costOfRuns(runs.map((r) => r.id));
  const runByJob = new Map(runs.map((r) => [r.scan_job_id!, r]));

  const rows = jobs.data.map((j): AdminScanRow => {
    const run = runByJob.get(j.id);
    return {
      id: j.id,
      status: j.status as ScanStatus,
      businessId: j.business_id,
      businessName: j.businesses?.name ?? "Deleted business",
      agencyName: j.agencies?.name ?? "",
      isTest: j.agencies?.is_test ?? false,
      models: jobModels(run?.provider ?? null, j.businesses?.models ?? []),
      creditsCharged: j.credits_charged,
      costUsd: run ? (cost.get(run.id) ?? 0) : null,
      // The run times the scan itself; a job that never got a run (skipped) falls back to the job times.
      durationMs: run ? durationMs(run.started_at, run.completed_at) : durationMs(j.locked_at, j.finished_at),
      createdAt: j.created_at,
      attempts: j.attempts,
      error: j.error,
    };
  });
  return { rows, counts };
}

async function countByStatus(): Promise<AdminScanList["counts"]> {
  const db = createServiceClient();
  const results = await Promise.all(
    SCAN_STATUSES.map((s) => db.from("scan_jobs").select("id", { count: "exact", head: true }).eq("status", s)),
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

async function runsOfJobs(jobIds: string[]) {
  if (jobIds.length === 0) return [];
  const { data, error } = await createServiceClient()
    .from("visibility_runs")
    .select("id, scan_job_id, provider, started_at, completed_at")
    .in("scan_job_id", jobIds);
  if (error) throw new Error(`Scans: ${error.message}`);
  return data;
}

// Real AI cost of each run: the sum of its checks' cost_usd (cache hits cost 0).
async function costOfRuns(runIds: string[]): Promise<Map<string, number>> {
  const rows: { run_id: string; cost_usd: number | null }[] = [];
  for (let i = 0; i < runIds.length; i += RUN_CHUNK) {
    const chunk = runIds.slice(i, i + RUN_CHUNK);
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await createServiceClient()
        .from("visibility_results")
        .select("run_id, cost_usd")
        .in("run_id", chunk)
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Scans: ${error.message}`);
      rows.push(...data);
      if (data.length < PAGE) break;
    }
  }
  return sumBy(rows, (r) => r.run_id, (r) => r.cost_usd);
}
