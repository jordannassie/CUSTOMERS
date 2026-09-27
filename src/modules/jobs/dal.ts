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
 * Puts a failed job back in the queue with fresh attempts (admin Retry, B-67). Like requeue_scan_job, a
 * closed hold with nothing charged is detached first, otherwise hold_credits would hand it back and the
 * scan would skip as already finished. An open hold stays, so the retry resumes it without charging twice.
 */
export async function retryFailedJob(jobId: string): Promise<RetryResult> {
  const db = createServiceClient();
  const { data: job, error } = await db.from("scan_jobs").select("status, hold_id").eq("id", jobId).maybeSingle();
  if (error) throw new Error(`Could not read the scan job: ${error.message}`);
  if (!job || job.status !== "failed") return "not_failed";

  if (job.hold_id) {
    const { data: hold, error: holdError } = await db
      .from("credit_holds")
      .select("status, captured")
      .eq("id", job.hold_id)
      .single();
    if (holdError) throw new Error(`Could not read the credit hold: ${holdError.message}`);
    if (hold.status === "closed" && hold.captured === 0) {
      // Detach from the failed job only; if it changed meanwhile, the requeue below finds it not failed.
      const detached = await db.from("scan_jobs").update({ hold_id: null }).eq("id", jobId).eq("status", "failed");
      if (detached.error) throw new Error(`Could not detach the credit hold: ${detached.error.message}`);
      const released = await db.from("credit_holds").update({ scan_job_id: null }).eq("id", job.hold_id);
      if (released.error) throw new Error(`Could not detach the credit hold: ${released.error.message}`);
    }
  }

  const { data, error: updateError } = await db
    .from("scan_jobs")
    .update({ status: "queued", attempts: 0, run_after: new Date().toISOString(), locked_at: null, finished_at: null, error: null })
    .eq("id", jobId)
    .eq("status", "failed")
    .select("id");
  // D-55: the business already has a queued or running job.
  if (updateError?.code === "23505") return "business_busy";
  if (updateError) throw new Error(`Could not queue the scan job again: ${updateError.message}`);
  return data.length > 0 ? "queued" : "not_failed";
}
