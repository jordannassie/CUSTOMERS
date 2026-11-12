import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/modules/auth";
import { getBalance } from "@/modules/credits";
import { emailsOf, readCaptures, unique } from "../dal";
import { latestResults, newestFinished } from "../results/dal";
import { explainScanError } from "../../scans/error-text";
import { isActive, runScanCheck, startOfMonthUtc, sumBy, toScanState, type ScanState } from "../service";

// Everything about one business for the admin detail page (B-66). Each read checks admin access itself (BUG-286).

export const HISTORY_LIMIT = 20;
// The newest opportunities are what support needs; the full list is on the customer's Actions page.
const OPPORTUNITY_LIMIT = 100;

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
export type { ResultRow } from "../results/dal";

/** Just the name, for the page title ("Joe's Coffee | Admin"). Null for an unknown id. */
export async function loadBusinessName(id: string): Promise<string | null> {
  await requireAdmin();
  const { data, error } = await createServiceClient().from("businesses").select("name").eq("id", id).maybeSingle();
  if (error) throw new Error(`Admin business: could not load the business name: ${error.message}`);
  return data?.name ?? null;
}

export async function loadBusinessDetail(id: string, now = new Date()) {
  await requireAdmin();
  const db = createServiceClient();
  const { data: business, error } = await db
    .from("businesses")
    .select(
      "id, name, domain, phone, primary_city, primary_region, primary_country, primary_area, industry, status, agency_id, owner_user_id, scan_frequency, models, next_scan_at, services, aliases, created_at, deleted_at, purge_after",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Admin business: could not load the business: ${error.message}`);
  if (!business) return null;

  const monthStart = startOfMonthUtc(now).toISOString();
  // Only the scans the page shows and the newest finished one: the history used to be read in full on every visit.
  const [agency, subscription, competitors, questions, jobsResult, lastDoneResult, oldRuns, lastOldDoneResult, jobCount, oldRunCount, opportunities, monthCredits, allCredits] = await Promise.all([
    business.agency_id
      ? db
          .from("agencies")
          .select("id, name, owner_user_id, is_test, status")
          .eq("id", business.agency_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db.from("business_subscriptions").select("status, plans(name)").eq("business_id", id).maybeSingle(),
    db.from("business_competitors").select("id, name, domain, city").eq("business_id", id).order("created_at"),
    db.from("tracked_prompts").select("id, prompt, active").eq("business_id", id).is("removed_at", null).order("created_at"),
    db
      .from("scan_jobs")
      .select("id, status, priority, attempts, hold_id, error, created_at, finished_at")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(HISTORY_LIMIT),
    db.from("scan_jobs").select("id, created_at").eq("business_id", id).eq("status", "done").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db
      .from("visibility_runs")
      .select("id, status, error, created_at, completed_at, checks_total, checks_failed")
      .eq("business_id", id)
      .is("scan_job_id", null)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT),
    // Scans from before the job queue are runs alone; the newest finished one may be newer than any finished job.
    db
      .from("visibility_runs")
      .select("id, created_at, provider, failed_by_provider")
      .eq("business_id", id)
      .is("scan_job_id", null)
      .in("status", ["completed", "done"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Every scan this business had, for "Showing the newest 20 of 34".
    db.from("scan_jobs").select("id", { count: "exact", head: true }).eq("business_id", id),
    db.from("visibility_runs").select("id", { count: "exact", head: true }).eq("business_id", id).is("scan_job_id", null),
    db
      .from("opportunities")
      .select("id, title, impact, status, category")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(OPPORTUNITY_LIMIT),
    db.rpc("admin_business_credits", { p_business_ids: [id], p_since: monthStart }),
    db.rpc("admin_business_credits", { p_business_ids: [id] }),
  ]);
  const jobs = must("scan jobs", jobsResult) ?? [];
  const lastDone = must("the last finished scan", lastDoneResult);
  const lastOldDone = must("the last finished older scan", lastOldDoneResult);
  if (jobCount.error || oldRunCount.error) throw new Error(`Admin business: could not count scans: ${(jobCount.error ?? oldRunCount.error)!.message}`);
  const creditTotal = (r: typeof monthCredits) => Number(must("credits", r)?.[0]?.credits ?? 0);
  const agencyRow = must("the agency", agency);
  const shown = jobs;

  const [captures, runs, emails, balance] = await Promise.all([
    readCaptures({ holdIds: unique(shown.map((j) => j.hold_id)) }),
    db
      .from("visibility_runs")
      .select("id, scan_job_id, checks_total, checks_failed, provider, failed_by_provider, created_at")
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
      checks: r.checks_total,
      checksFailed: r.checks_failed,
      credits: 0,
      error: r.error,
    })),
  ]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, HISTORY_LIMIT);

  const ownerId = agencyRow?.owner_user_id ?? business.owner_user_id;
  const sub = must("the plan", subscription);
  const activeQuestions = (must("questions", questions) ?? []).filter((q) => q.active).length;
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
    /** Every scan this business had; the history shows the newest HISTORY_LIMIT. */
    scanTotal: (jobCount.count ?? 0) + (oldRunCount.count ?? 0),
    activeScan: jobs.some((j) => isActive(toScanState(j.status))),
    // Whether "Run scan now" can do anything useful, and what to know first (admin audit 2026-11-12).
    runScan: runScanCheck(
      {
        deleted: business.deleted_at !== null,
        agency: agencyRow ? { name: agencyRow.name, status: agencyRow.status } : null,
        status: business.status,
        city: business.primary_city,
        activeQuestions,
        models: business.models,
        balance: balance ? (balance.balance ?? 0) : null,
        lastScan: scans[0] ? { state: scans[0].state, error: scans[0].error } : null,
      },
      (error) => explainScanError(error)?.summary ?? null,
    ),
    credits: {
      thisMonth: creditTotal(monthCredits),
      allTime: creditTotal(allCredits),
    },
    results: await latestResults(newestFinished(lastDone, runOfJob, lastOldDone)),
  };
}
