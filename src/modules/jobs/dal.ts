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
