import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// scan_jobs access for the worker (B-27, MVP_SPEC 6.3). Service role: the worker runs with no user session.

export type ClaimedJob = { id: string; attempts: number; creditsCharged: number };

export type JobUpdate =
  | { status: "done"; creditsCharged: number; error: string | null }
  | { status: "queued"; runAfter: Date; error: string }
  | { status: "failed"; error: string };

export async function claimScanJobs(limit: number): Promise<ClaimedJob[]> {
  const { data, error } = await createServiceClient().rpc("claim_scan_jobs", { p_limit: limit });
  if (error) throw new Error(`claim_scan_jobs failed: ${error.message}`);
  return data.map((row) => ({ id: row.id, attempts: row.attempts, creditsCharged: row.credits_charged }));
}

/**
 * Saves how a claimed job ended. Matching on attempts means a job that reset_stuck_jobs handed to another
 * worker is left alone. Returns false when the job was no longer ours.
 */
export async function finishJob(job: ClaimedJob, update: JobUpdate, now: Date): Promise<boolean> {
  const db = createServiceClient();
  if (update.status === "queued") {
    const { data, error } = await db.rpc("requeue_scan_job", {
      p_job_id: job.id,
      p_attempts: job.attempts,
      p_run_after: update.runAfter.toISOString(),
      p_error: update.error,
    });
    if (error) throw new Error(`requeue_scan_job failed: ${error.message}`);
    return data;
  }
  const fields = {
    status: update.status,
    error: update.error,
    finished_at: now.toISOString(),
    ...(update.status === "done" ? { credits_charged: update.creditsCharged } : {}),
  };
  const { data, error } = await db
    .from("scan_jobs")
    .update(fields)
    .eq("id", job.id)
    .eq("attempts", job.attempts)
    .eq("status", "running")
    .select("id");
  if (error) throw new Error(`Could not save the scan job: ${error.message}`);
  return data.length > 0;
}

export async function resetStuckJobs(): Promise<number> {
  const { data, error } = await createServiceClient().rpc("reset_stuck_jobs");
  if (error) throw new Error(`reset_stuck_jobs failed: ${error.message}`);
  return data;
}

/** Constant-time check of the x-worker-secret header. With no WORKER_SECRET set, every call is refused. */
export function isWorkerSecret(header: string | null): boolean {
  const secret = env.WORKER_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function workerTimeBudgetMs(): number {
  return env.WORKER_TIME_BUDGET_SECONDS * 1000;
}

export type RetryResult = "queued" | "not_failed" | "business_busy";

/**
 * Puts a failed job back in the queue with fresh attempts (admin Retry, B-67), in one transaction through
 * retry_scan_job (migration 033), which also detaches a closed hold that charged nothing.
 */
export async function retryFailedJob(jobId: string): Promise<RetryResult> {
  const { data, error } = await createServiceClient().rpc("retry_scan_job", { p_job_id: jobId });
  if (error) throw new Error(`Could not queue the scan job again: ${error.message}`);
  return data as RetryResult;
}

// Above the scheduled scans (priority 0), so a manual scan is claimed first (MVP_SPEC 6.4).
export const MANUAL_PRIORITY = 100;

export type LatestJob = {
  status: "queued" | "running" | "done" | "failed";
  finishedAt: string | null;
  /** The last attempt's error; set on a queued job when a failed attempt waits to run again. */
  error: string | null;
  runAfter: string;
};

/** The business's agency, or null when the business does not exist. */
export async function businessAgencyId(businessId: string): Promise<string | null> {
  const { data, error } = await createServiceClient()
    .from("businesses")
    .select("agency_id")
    .eq("id", businessId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the business: ${error.message}`);
  return data?.agency_id ?? null;
}

/** Returns false when the business already has a queued or running job (the D-55 unique index). */
export async function insertManualJob(agencyId: string, businessId: string): Promise<boolean> {
  const { error } = await createServiceClient()
    .from("scan_jobs")
    .insert({ agency_id: agencyId, business_id: businessId, priority: MANUAL_PRIORITY });
  if (error?.code === "23505") return false;
  if (error) throw new Error(`Could not queue the scan: ${error.message}`);
  return true;
}

export async function latestJob(businessId: string): Promise<LatestJob | null> {
  const { data, error } = await createServiceClient()
    .from("scan_jobs")
    .select("status, finished_at, error, run_after")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the scan status: ${error.message}`);
  return (
    data && {
      status: data.status as LatestJob["status"],
      finishedAt: data.finished_at,
      error: data.error,
      runAfter: data.run_after,
    }
  );
}

/**
 * Starts the hosted worker now instead of at the next scheduled minute. Returns false when no WORKER_URL
 * is set. A Netlify background function answers 202 at once, so this does not wait for the scan.
 */
export async function postToWorker(): Promise<boolean> {
  if (!env.WORKER_URL || !env.WORKER_SECRET) return false;
  const res = await fetch(env.WORKER_URL, {
    method: "POST",
    headers: { "x-worker-secret": env.WORKER_SECRET },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Worker answered ${res.status}`);
  return true;
}

export function runWorkerInProcess(): boolean {
  return env.WORKER_IN_PROCESS === "true";
}
