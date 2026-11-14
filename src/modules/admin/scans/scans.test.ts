import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { grantCredits, holdCredits, releaseHold } from "@/modules/credits";
import { REASONS } from "@/modules/entitlements";
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
const { listScanFilterOptions, listScanJobs } = await import("./dal");
const { scanListQuery } = await import("./schema");

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
  const { data, error } = await service.from("admin_audit_log").select("action, target_type, admin_user_id, outcome").eq("target_id", jobId).order("created_at");
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  agency = await createAgencyWithBusiness("Scans test");
  await grantCredits({ agencyId: agency.agencyId, source: "topup", sourceId: `cs-${randomUUID()}`, amount: 50, expiresAt: null });
});

afterAll(deleteTestUsers);

describe("admin Scans (B-67)", () => {
  it("lists a failed job with its business, models, error and what a retry would charge", async () => {
    await signInAs(session, "scans-admin", { admin: true });
    // Two active questions and one switched off: a retry asks 2 questions of 3 models.
    await service
      .from("tracked_prompts")
      .insert([
        { business_id: agency.businessId, prompt: "best coffee in Testville", active: true },
        { business_id: agency.businessId, prompt: "coffee near me", active: true },
        { business_id: agency.businessId, prompt: "cheap coffee", active: false },
      ])
      .throwOnError();
    const { jobId } = await failedJob();
    const list = await listScanJobs(scanListQuery.parse({ status: "failed", agency: agency.agencyId }));
    const row = list.rows.find((r) => r.id === jobId);
    expect(row).toMatchObject({
      status: "failed",
      businessName: "Scans test Coffee",
      agencyName: "Scans test",
      isTest: true,
      models: ["openai", "anthropic", "perplexity"],
      creditsCharged: 0,
      error: "Every check failed: timeout",
      scanCredits: 6,
    });
    expect(list.rows.every((r) => r.status === "failed")).toBe(true);
    expect(list.counts.failed).toBeGreaterThanOrEqual(1);
    expect(list.agencyName).toBe("Scans test");

    // The filters (admin review 2026-11-12): real agencies only leaves the test agency out; dates bound the list.
    const real = await listScanJobs(scanListQuery.parse({ status: "failed", agency: agency.agencyId, test: "real" }));
    expect(real.rows).toEqual([]);
    expect(real.counts.all).toBe(0);
    const today = new Date().toISOString().slice(0, 10);
    expect((await listScanJobs(scanListQuery.parse({ agency: agency.agencyId, from: today }))).rows.map((r) => r.id)).toContain(jobId);
    expect((await listScanJobs(scanListQuery.parse({ agency: agency.agencyId, to: "2020-01-01" }))).total).toBe(0);
    // A value that does not parse is no filter.
    expect(scanListQuery.parse({ from: "yesterday", test: "maybe", page: "-3" })).toEqual({ page: 1, test: "all" });
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
    expect(await auditRows(jobId)).toEqual([{ action: "scan_job.retry", target_type: "scan_job", admin_user_id: admin.id, outcome: "done" }]);

    // A second click finds nothing to retry; its history row says it did not go through (BUG-278).
    expect(await retryScan({ jobId })).toMatchObject({ ok: false, status: 409 });
    expect((await auditRows(jobId)).map((r) => r.outcome)).toEqual(["done", "failed"]);

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
    await expect(listScanJobs(scanListQuery.parse({}))).rejects.toThrow();
    expect(await auditRows(jobId)).toEqual([]);

    await signInAs(session, "scans-admin", { admin: true });
    expect(await retryScan({ jobId: "not-a-uuid" })).toMatchObject({ ok: false, status: 400 });
    await service.from("scan_jobs").delete().eq("id", jobId);
  });

  it("shows the last page for a page past the end, and says which page it shows (admin audit 2026-11-12)", async () => {
    await signInAs(session, "scans-admin", { admin: true });
    const { jobId } = await failedJob();
    const list = await listScanJobs(scanListQuery.parse({ agency: agency.agencyId, page: "40" }));
    expect(list.page).toBe(1);
    expect(list.rows.map((r) => r.id)).toContain(jobId);
    await service.from("scan_jobs").delete().eq("id", jobId);
  });

  it("drops Retry for a scan a newer one replaced, and for a skip retrying cannot fix; notes a done scan's failed checks", async () => {
    await signInAs(session, "scans-admin", { admin: true });
    const old = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const insert = async (row: { status: string; error?: string | null; created_at?: string }) => {
      const { data, error } = await service
        .from("scan_jobs")
        .insert({ agency_id: agency.agencyId, business_id: agency.businessId, priority: LOW_PRIORITY, attempts: 1, finished_at: new Date().toISOString(), ...row })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    };
    const failed = await insert({ status: "failed", error: "Every check failed: timeout", created_at: old });
    const trial = await insert({ status: "skipped", error: REASONS.trialOver, created_at: old });
    const done = await insert({ status: "done" });
    await service
      .from("visibility_runs")
      .insert({
        business_id: agency.businessId,
        scan_job_id: done,
        provider: "openai,anthropic,perplexity",
        status: "completed",
        completed_at: new Date().toISOString(),
        checks_total: 36,
        checks_failed: 12,
        failed_by_provider: { perplexity: { failed: 12, reason: "timeout" } },
      })
      .throwOnError();

    const rows = new Map((await listScanJobs(scanListQuery.parse({ agency: agency.agencyId }))).rows.map((r) => [r.id, r]));
    expect(rows.get(failed)).toMatchObject({ canRetry: false, retryNote: "A newer scan of this business finished, so this one needs no retry." });
    expect(rows.get(trial)).toMatchObject({ canRetry: false, retryNote: expect.stringContaining("A newer scan") });
    // A test agency's run with nothing logged: no cost recorded, shown as $0.00 on the page.
    expect(rows.get(done)).toMatchObject({ hasRun: true, costUsd: null, isTest: true, note: "12 of 36 checks failed (Perplexity).", canRetry: false });

    // With the newer scan gone, the failed one can be retried again; the trial skip still cannot.
    await service.from("scan_jobs").delete().eq("id", done);
    const after = new Map((await listScanJobs(scanListQuery.parse({ agency: agency.agencyId }))).rows.map((r) => [r.id, r]));
    expect(after.get(failed)).toMatchObject({ canRetry: true, retryNote: null });
    expect(after.get(trial)).toMatchObject({ canRetry: false, retryNote: expect.stringContaining("once the agency pays") });
    await service.from("scan_jobs").delete().in("id", [failed, trial]);
  });

  it("names a deleted business filtered to, and tells repeated names apart in the filter lists", async () => {
    await signInAs(session, "scans-admin", { admin: true });
    const twin = await createAgencyWithBusiness("Scans twin");
    const twin2 = await createAgencyWithBusiness("Scans twin");
    await service.from("businesses").update({ deleted_at: new Date().toISOString() }).eq("id", twin2.businessId).throwOnError();

    const list = await listScanJobs(scanListQuery.parse({ business: twin2.businessId }));
    expect(list.business).toEqual({ name: "Scans twin Coffee", deleted: true });
    expect(list.total).toBe(0);

    const options = await listScanFilterOptions();
    const twins = options.agencies.filter((a) => a.id === twin.agencyId || a.id === twin2.agencyId).map((a) => a.label);
    expect(twins).toHaveLength(2);
    expect(twins.every((l) => /^Scans twin \(.+@.+\)$/.test(l))).toBe(true);
    expect(new Set(twins).size).toBe(2);
    expect(options.businesses.some((b) => b.id === twin2.businessId)).toBe(false);
  });
});
