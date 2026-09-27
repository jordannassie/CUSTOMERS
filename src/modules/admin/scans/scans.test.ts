import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { grantCredits, holdCredits, releaseHold } from "@/modules/credits";
import { createAgencyWithBusiness, deleteTestUsers, service, signInAs, type TestSession } from "../admin.test-helpers";

// Runs against the local database `npm test` rebuilds, signed in as a real test user.
const session = vi.hoisted((): TestSession => ({ client: null, adminEmails: "" }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => session.client }));
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: new Proxy(env, { get: (t, key) => (key === "ADMIN_EMAILS" ? session.adminEmails : Reflect.get(t, key)) }) };
});
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const { retryScan } = await import("./actions");
const { listScanJobs } = await import("./dal");

// Below anything the worker tests queue, so their claims reach these jobs last.
const LOW_PRIORITY = -1_000_000;
let agency: Awaited<ReturnType<typeof createAgencyWithBusiness>>;

/** A job that failed after its hold was released with nothing charged, like a scan whose every check failed. */
async function failedJob(businessId = agency.businessId) {
  // Inserted as failed straight away: a queued row would clash with D-55's one active job per business.
  const { data: job, error } = await service
    .from("scan_jobs")
    .insert({
      agency_id: agency.agencyId,
      business_id: businessId,
      priority: LOW_PRIORITY,
      status: "failed",
      attempts: 3,
      error: "Every check failed: timeout",
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  const holdId = await holdCredits(agency.agencyId, 3, job.id);
  await releaseHold(holdId);
  return { jobId: job.id, holdId };
}

async function readJob(jobId: string) {
  const { data, error } = await service.from("scan_jobs").select("status, attempts, error, hold_id, finished_at").eq("id", jobId).single();
  if (error) throw error;
  return data;
}

async function auditRows(jobId: string) {
  const { data, error } = await service.from("admin_audit_log").select("action, target_type, admin_user_id").eq("target_id", jobId);
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  agency = await createAgencyWithBusiness("Scans test");
  await grantCredits({ agencyId: agency.agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount: 50, expiresAt: null });
});

afterAll(deleteTestUsers);

describe("admin Scans (B-67)", () => {
  it("lists a failed job with its business, models and error", async () => {
    await signInAs(session, "scans-admin", { admin: true });
    const { jobId } = await failedJob();
    const list = await listScanJobs("failed");
    const row = list.rows.find((r) => r.id === jobId);
    expect(row).toMatchObject({
      status: "failed",
      businessName: "Scans test Coffee",
      agencyName: "Scans test",
      isTest: true,
      models: ["openai", "anthropic", "perplexity"],
      creditsCharged: 0,
      error: "Every check failed: timeout",
    });
    expect(list.rows.every((r) => r.status === "failed")).toBe(true);
    expect(list.counts.failed).toBeGreaterThanOrEqual(1);
    await service.from("scan_jobs").delete().eq("id", jobId);
  });

  it("Retry puts a failed job back in the queue with fresh attempts, frees its closed hold, and logs who did it", async () => {
    const admin = await signInAs(session, "scans-admin", { admin: true });
    const { jobId, holdId } = await failedJob();

    const result = await retryScan({ jobId });
    expect(result).toEqual({ ok: true, data: { jobId } });
    expect(await readJob(jobId)).toEqual({ status: "queued", attempts: 0, error: null, hold_id: null, finished_at: null });
    // hold_credits would otherwise hand the closed hold back and the scan would skip as already finished.
    const { data: hold } = await service.from("credit_holds").select("scan_job_id").eq("id", holdId).single();
    expect(hold?.scan_job_id).toBeNull();
    expect(await auditRows(jobId)).toEqual([{ action: "scan_job.retry", target_type: "scan_job", admin_user_id: admin.id }]);

    // A second click finds nothing to retry and logs nothing.
    expect(await retryScan({ jobId })).toMatchObject({ ok: false, status: 409 });
    expect(await auditRows(jobId)).toHaveLength(1);

    // D-55: while that job waits, another failed job of the same business cannot be queued too.
    const second = await failedJob();
    expect(await retryScan({ jobId: second.jobId })).toMatchObject({
      ok: false,
      status: 409,
      error: "This business already has a scan waiting or running.",
    });
    expect((await readJob(second.jobId)).status).toBe("failed");

    await service.from("scan_jobs").delete().in("id", [jobId, second.jobId]);
  });

  it("refuses non-admins and bad input without touching the job", async () => {
    await signInAs(session, "scans-user", { admin: false });
    const { jobId } = await failedJob();
    expect(await retryScan({ jobId })).toMatchObject({ ok: false, status: 403 });
    expect((await readJob(jobId)).status).toBe("failed");
    await expect(listScanJobs(undefined)).rejects.toThrow();
    expect(await auditRows(jobId)).toEqual([]);

    await signInAs(session, "scans-admin", { admin: true });
    expect(await retryScan({ jobId: "not-a-uuid" })).toMatchObject({ ok: false, status: 400 });
    await service.from("scan_jobs").delete().eq("id", jobId);
  });
});
