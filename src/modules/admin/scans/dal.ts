import "server-only";
import { requireAdmin } from "@/modules/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { allRows, inChunks } from "../businesses/dal";
import { SCAN_STATUSES, type ScanListQuery, type ScanStatus } from "./schema";
import { durationMs, jobModels } from "./service";

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
  costUsd: number | null;
  durationMs: number | null;
  createdAt: string;
  attempts: number;
  error: string | null;
  /** What running it again charges: the business's active questions times its models (one credit per check). */
  scanCredits: number;
};

export type AdminScanList = {
  rows: AdminScanRow[];
  /** Per status, with the date, agency and test filters applied. */
  counts: Record<ScanStatus | "all", number>;
  total: number;
  page: number;
  pages: number;
  /** The agency filtered to, for the "Agency: … ×" chip. */
  agencyName: string | null;
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

  let list = filtered(
    db
      .from("scan_jobs")
      .select(
        `id, status, business_id, agency_id, attempts, credits_charged, error, created_at, locked_at, finished_at, businesses(name, models), ${agencies}`,
        { count: "exact" },
      ),
    f,
  );
  if (status) list = list.eq("status", status);
  const from = (page - 1) * SCAN_PAGE_SIZE;

  const [jobs, counts, agency] = await Promise.all([
    list.order("created_at", { ascending: false }).order("id").range(from, from + SCAN_PAGE_SIZE - 1),
    countByStatus(f),
    f.agency ? db.from("agencies").select("name").eq("id", f.agency).maybeSingle() : null,
  ]);
  if (jobs.error) throw new Error(`Scans: ${jobs.error.message}`);

  const [runs, questions, cost] = await Promise.all([
    runsOfJobs(jobs.data.map((j) => j.id)),
    activeQuestions([...new Set(jobs.data.map((j) => j.business_id))]),
    costOfJobs(jobs.data.map((j) => j.id)),
  ]);
  const runByJob = new Map(runs.map((r) => [r.scan_job_id!, r]));

  const rows = jobs.data.map((j): AdminScanRow => {
    const run = runByJob.get(j.id);
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
      costUsd: run ? (cost.get(j.id) ?? 0) : null,
      // The run times the scan itself; a job that never got a run (skipped) falls back to the job times.
      durationMs: run ? durationMs(run.started_at, run.completed_at) : durationMs(j.locked_at, j.finished_at),
      createdAt: j.created_at,
      attempts: j.attempts,
      error: j.error,
      scanCredits: (questions.get(j.business_id) ?? 0) * (j.businesses?.models.length ?? 0),
    };
  });
  const total = jobs.count ?? 0;
  return { rows, counts, total, page, pages: Math.max(1, Math.ceil(total / SCAN_PAGE_SIZE)), agencyName: agency?.data?.name ?? null };
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
    .select("id, scan_job_id, provider, started_at, completed_at")
    .in("scan_job_id", jobIds);
  if (error) throw new Error(`Scans: ${error.message}`);
  return data;
}

// Real AI cost of each job from the usage log, the same source as Usage and cost and the Overview (migration 092), so
// the three pages agree. It includes the scan's other AI work (reading names, explanations), not only the checks.
async function costOfJobs(jobIds: string[]): Promise<Map<string, number>> {
  if (jobIds.length === 0) return new Map();
  const { data, error } = await createServiceClient().rpc("admin_scan_costs", { p_job_ids: jobIds });
  if (error) throw new Error(`Scans: ${error.message}`);
  return new Map(data.map((r) => [r.scan_job_id, Number(r.cost_usd)]));
}

export type ScanFilterOptions = {
  agencies: { id: string; name: string }[];
  businesses: { id: string; name: string; agencyId: string | null }[];
};

// Enough for every agency and business today; the lists are for picking one, so they stay light (id and name).
const OPTION_LIMIT = 1000;

/** The agencies and businesses the Scans page can filter to, by name. */
export async function listScanFilterOptions(): Promise<ScanFilterOptions> {
  await requireAdmin();
  const db = createServiceClient();
  const [agencies, businesses] = await Promise.all([
    db.from("agencies").select("id, name").neq("status", "deleted").order("name").limit(OPTION_LIMIT),
    db.from("businesses").select("id, name, agency_id").is("deleted_at", null).order("name").limit(OPTION_LIMIT),
  ]);
  if (agencies.error) throw new Error(`Scans: ${agencies.error.message}`);
  if (businesses.error) throw new Error(`Scans: ${businesses.error.message}`);
  return {
    agencies: agencies.data.map((a) => ({ id: a.id, name: a.name })),
    businesses: businesses.data.map((b) => ({ id: b.id, name: b.name, agencyId: b.agency_id })),
  };
}
