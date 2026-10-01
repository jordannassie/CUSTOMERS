import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { ADMIN_SCAN_PRIORITY, firstBy, startOfMonthUtc, sumBy, toScanState, type ScanState } from "./service";

// Admin reads cross every agency, so they use the service role; callers run requireAdmin() first.

const PAGE = 1000;
// Keeps each .in() filter well inside the URL length limit.
const ID_CHUNK = 200;

function fail(what: string, error: { message: string }): never {
  throw new Error(`Admin businesses: could not load ${what}: ${error.message}`);
}

export async function inChunks<T>(ids: string[], load: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const chunks = Array.from({ length: Math.ceil(ids.length / ID_CHUNK) }, (_, i) =>
    ids.slice(i * ID_CHUNK, (i + 1) * ID_CHUNK),
  );
  return (await Promise.all(chunks.map(load))).flat();
}

type Page<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

/** Every row, a page at a time: PostgREST caps a response at 1,000 rows. */
export async function allRows<T>(what: string, page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) fail(what, error);
    rows.push(...data!);
    if (data!.length < PAGE) return rows;
  }
}

export const unique = (ids: (string | null)[]) => [...new Set(ids.filter((id): id is string => id !== null))];

/** Login email of each user id; auth users are not readable through PostgREST. */
export async function emailsOf(userIds: string[]): Promise<Map<string, string>> {
  const wanted = new Set(userIds);
  const emails = new Map<string, string>();
  if (wanted.size === 0) return emails;
  for (let page = 1; ; page++) {
    const { data, error } = await createServiceClient().auth.admin.listUsers({
      page,
      perPage: PAGE,
    });
    if (error) fail("owner emails", error);
    for (const u of data.users) if (wanted.has(u.id) && u.email) emails.set(u.id, u.email);
    if (data.users.length < PAGE || emails.size === wanted.size) return emails;
  }
}

export type Capture = {
  holdId: string | null;
  credits: number;
  createdAt: string;
};

/** Credits spent on checks, from the ledger (captures are negative deltas). */
export async function readCaptures(filter: { since?: Date; holdIds?: string[] }): Promise<Capture[]> {
  if (filter.holdIds?.length === 0) return [];
  const rows = await allRows("credit captures", (from, to) => {
    let query = createServiceClient()
      .from("credit_transactions")
      .select("id, hold_id, delta, created_at")
      .eq("kind", "capture");
    if (filter.since) query = query.gte("created_at", filter.since.toISOString());
    if (filter.holdIds) query = query.in("hold_id", filter.holdIds);
    return query.order("created_at").order("id").range(from, to);
  });
  return rows.map((r) => ({
    holdId: r.hold_id,
    credits: -r.delta,
    createdAt: r.created_at,
  }));
}

export type AdminBusinessRow = {
  id: string;
  name: string;
  location: string;
  agency: { name: string; ownerEmail: string | null; isTest: boolean } | null;
  plan: string | null;
  frequency: string;
  models: string[];
  lastScan: { state: ScanState; at: string } | null;
  creditsThisMonth: number;
  deleted: { at: string; purgeAfter: string | null } | null;
};

export async function listBusinesses(now = new Date()): Promise<AdminBusinessRow[]> {
  const db = createServiceClient();
  const [businesses, agencies, subscriptions, captures] = await Promise.all([
    allRows("businesses", (from, to) =>
      db
        .from("businesses")
        .select("id, name, primary_city, primary_region, agency_id, scan_frequency, models, created_at, deleted_at, purge_after")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    allRows("agencies", (from, to) =>
      db.from("agencies").select("id, name, owner_user_id, is_test").order("id").range(from, to),
    ),
    allRows("plans", (from, to) =>
      db.from("business_subscriptions").select("business_id, plans(name)").order("business_id").range(from, to),
    ),
    readCaptures({ since: startOfMonthUtc(now) }),
  ]);

  const ids = businesses.map((b) => b.id);
  const [jobs, runs, holdJobs, emails] = await Promise.all([
    inChunks(ids, (chunk) =>
      allRows("scan jobs", (from, to) =>
        db
          .from("scan_jobs")
          .select("business_id, status, created_at, finished_at")
          .in("business_id", chunk)
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
    ),
    // Businesses scanned before the job queue existed only have runs.
    inChunks(ids, (chunk) =>
      allRows("scan runs", (from, to) =>
        db
          .from("visibility_runs")
          .select("business_id, status, created_at, completed_at")
          .in("business_id", chunk)
          .is("scan_job_id", null)
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
      ),
    ),
    inChunks(unique(captures.map((c) => c.holdId)), async (chunk) => {
      const { data, error } = await db.from("scan_jobs").select("hold_id, business_id").in("hold_id", chunk);
      if (error) fail("scan holds", error);
      return data;
    }),
    emailsOf(agencies.map((a) => a.owner_user_id)),
  ]);

  const agencyById = new Map(agencies.map((a) => [a.id, a]));
  const planOf = new Map(subscriptions.map((s) => [s.business_id, s.plans?.name ?? null]));
  const lastJob = firstBy(jobs, (j) => j.business_id);
  const lastRun = firstBy(runs, (r) => r.business_id);
  const businessOfHold = new Map(holdJobs.map((j) => [j.hold_id!, j.business_id]));
  const credits = sumBy(
    captures,
    (c) => c.holdId && businessOfHold.get(c.holdId),
    (c) => c.credits,
  );

  return businesses.map((b) => {
    const agency = b.agency_id ? agencyById.get(b.agency_id) : undefined;
    const job = lastJob.get(b.id);
    const run = lastRun.get(b.id);
    const lastScan = job
      ? {
          state: toScanState(job.status),
          at: job.finished_at ?? job.created_at,
        }
      : run
        ? {
            state: toScanState(run.status),
            at: run.completed_at ?? run.created_at,
          }
        : null;
    return {
      id: b.id,
      name: b.name,
      location: [b.primary_city, b.primary_region].filter(Boolean).join(", "),
      agency: agency
        ? {
            name: agency.name,
            ownerEmail: emails.get(agency.owner_user_id) ?? null,
            isTest: agency.is_test,
          }
        : null,
      plan: planOf.get(b.id) ?? null,
      frequency: b.scan_frequency,
      models: b.models,
      lastScan,
      creditsThisMonth: credits.get(b.id) ?? 0,
      deleted: b.deleted_at ? { at: b.deleted_at, purgeAfter: b.purge_after } : null,
    };
  });
}

export type EnqueueResult =
  | { ok: true; jobId: string }
  | { ok: false; reason: "not_found" | "no_agency" | "deleted" | "agency_deleted" | "already_active" };

/** Queues a high-priority scan; the worker (B-27) holds credits and runs it. */
export async function enqueueScan(businessId: string): Promise<EnqueueResult> {
  const db = createServiceClient();
  const { data: business, error } = await db
    .from("businesses")
    .select("agency_id, deleted_at, agencies(status)")
    .eq("id", businessId)
    .maybeSingle();
  if (error) fail("the business", error);
  if (!business) return { ok: false, reason: "not_found" };
  if (!business.agency_id) return { ok: false, reason: "no_agency" };
  // The worker's claim does not look at deleted_at, so a job queued here would spend credits on deleted data.
  if (business.deleted_at) return { ok: false, reason: "deleted" };
  if (business.agencies?.status === "deleted") return { ok: false, reason: "agency_deleted" };

  const insert = await db
    .from("scan_jobs")
    .insert({
      business_id: businessId,
      agency_id: business.agency_id,
      priority: ADMIN_SCAN_PRIORITY,
    })
    .select("id")
    .single();
  // D-55: the unique index allows one queued or running job per business.
  if (insert.error?.code === "23505") return { ok: false, reason: "already_active" };
  if (insert.error) throw new Error(`Admin businesses: could not queue the scan: ${insert.error.message}`);
  return { ok: true, jobId: insert.data.id };
}
