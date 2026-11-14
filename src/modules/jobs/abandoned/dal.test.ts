import { afterAll, describe, expect, it } from "vitest";
import { ABANDONED_ERROR } from "@/lib/scan-job-staleness";
import { createTestAgency, deleteTestUsers, queueTestJob, readJob, service } from "../jobs.test-helpers";
import { abandonStaleJobs } from "./dal";

// MVP test 2026-11-14: a scan the worker never ran blocked Run scan for days ("A scan is already running").
afterAll(deleteTestUsers);

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

describe("abandonStaleJobs", () => {
  it("fails a queued scan no worker ran for over two hours, uncharged, and leaves a fresh one alone", async () => {
    const agency = await createTestAgency(100);
    const stale = await queueTestJob(agency);
    await service.from("scan_jobs").update({ run_after: hoursAgo(3) }).eq("id", stale.jobId).throwOnError();

    expect(await abandonStaleJobs(stale.businessId)).toBe(1);
    expect(await readJob(stale.jobId)).toMatchObject({ status: "failed", error: ABANDONED_ERROR, credits_charged: 0 });
    // The one-active-job slot is free again: a new scan can be queued.
    const fresh = await service.from("scan_jobs").insert({ agency_id: agency.agencyId, business_id: stale.businessId }).select("id").single();
    expect(fresh.error).toBeNull();
    expect(await abandonStaleJobs(stale.businessId)).toBe(0);
  });

  it("fails a running scan that showed no sign of life for over two hours, through fail_scan_job", async () => {
    const agency = await createTestAgency(100);
    const job = await queueTestJob(agency);
    await service.from("scan_jobs").update({ status: "running", attempts: 1, locked_at: hoursAgo(3) }).eq("id", job.jobId).throwOnError();

    expect(await abandonStaleJobs(null)).toBeGreaterThanOrEqual(1);
    expect(await readJob(job.jobId)).toMatchObject({ status: "failed", error: ABANDONED_ERROR });
  });

  it("leaves a running scan alone while it keeps refreshing locked_at", async () => {
    const agency = await createTestAgency(100);
    const job = await queueTestJob(agency);
    await service.from("scan_jobs").update({ status: "running", attempts: 1, locked_at: hoursAgo(0.1) }).eq("id", job.jobId).throwOnError();

    await abandonStaleJobs(job.businessId);
    expect(await readJob(job.jobId)).toMatchObject({ status: "running" });
  });
});
