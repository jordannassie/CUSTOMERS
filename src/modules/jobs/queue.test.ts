import { afterAll, describe, expect, it, vi } from "vitest";
import { runScan } from "@/modules/scanning";
import { getBalance } from "@/modules/credits";
import { claimScanJobs, finishJob, resetStuckJobs } from "./dal";
import {
  createTestAgency,
  deleteTestUsers,
  emptyRecordedDir,
  queueTestJob,
  readJob,
  recordedDir,
  service,
  type TestJob,
} from "./jobs.test-helpers";
import { handleWorkerRequest, runWorker, type WorkerDeps } from "./worker";

// Against the local database (npm test resets it first). Test agencies only: no AI calls (D-61).
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: { ...env, WORKER_SECRET: "test-worker-secret", WORKER_TIME_BUDGET_SECONDS: 60 } };
});

afterAll(deleteTestUsers);

/** The real worker, limited to our jobs so it never claims another test's or a developer's queued job. */
function workerDeps(jobs: TestJob[], dir: string): WorkerDeps & { ran: string[] } {
  const ours = new Set(jobs.map((j) => j.jobId));
  const ran: string[] = [];
  return {
    ran,
    claim: async (limit) => {
      const { count } = await service.from("scan_jobs").select("id", { count: "exact", head: true })
        .in("id", [...ours]).eq("status", "queued").lte("run_after", new Date().toISOString());
      return count ? claimScanJobs(Math.min(limit, count)) : [];
    },
    run: (jobId) => {
      ran.push(jobId);
      return runScan(jobId, { recordedDir: dir });
    },
    finish: finishJob,
    now: () => new Date(),
  };
}

describe("claim_scan_jobs", () => {
  it("never gives the same job to two workers claiming at once", async () => {
    const agency = await createTestAgency();
    const jobs = await Promise.all(Array.from({ length: 12 }, () => queueTestJob(agency)));
    const claims = await Promise.all(Array.from({ length: 4 }, () => claimScanJobs(3)));
    const ids = claims.flat().map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(jobs.map((j) => j.jobId).sort());
    expect(claims.flat().every((j) => j.attempts === 1)).toBe(true);
  });

  it("two workers running at once scan every job exactly once", async () => {
    const agency = await createTestAgency(1000);
    const jobs = await Promise.all(Array.from({ length: 6 }, () => queueTestJob(agency)));
    const dir = recordedDir();
    const [a, b] = [workerDeps(jobs, dir), workerDeps(jobs, dir)];
    await Promise.all([runWorker(60_000, a), runWorker(60_000, b)]);
    const ran = [...a.ran, ...b.ran];
    expect(new Set(ran).size).toBe(ran.length);
    expect(ran.sort()).toEqual(jobs.map((j) => j.jobId).sort());
    for (const job of jobs) expect(await readJob(job.jobId)).toMatchObject({ status: "done", credits_charged: 36 });
  }, 60_000);
});

describe("worker", () => {
  it("turns a queued test job into done through the secret-checked entry point", async () => {
    const agency = await createTestAgency();
    const job = await queueTestJob(agency);
    const deps = workerDeps([job], recordedDir());
    const started = Date.now();
    const res = await handleWorkerRequest(
      new Request("http://localhost/worker", { method: "POST", headers: { "x-worker-secret": "test-worker-secret" } }),
      deps,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ claimed: 1, done: 1 });
    expect(Date.now() - started).toBeLessThan(60_000);
    const row = await readJob(job.jobId);
    expect(row).toMatchObject({ status: "done", attempts: 1, credits_charged: 36, error: null });
    expect(row.finished_at).not.toBeNull();
    expect((await getBalance(agency.agencyId))?.balance).toBe(64);
  }, 60_000);

  it("a job failing 3 times ends failed with the error saved, and is never charged", async () => {
    const agency = await createTestAgency();
    const job = await queueTestJob(agency);
    const deps = workerDeps([job], emptyRecordedDir());

    for (const attempt of [1, 2]) {
      const before = Date.now();
      await runWorker(60_000, deps);
      const row = await readJob(job.jobId);
      expect(row).toMatchObject({ status: "queued", attempts: attempt, hold_id: null });
      expect(row.error).toContain("No recorded");
      const wait = new Date(row.run_after).getTime() - before;
      expect(wait).toBeGreaterThanOrEqual(attempt * 5 * 60_000);
      expect(wait).toBeLessThan(attempt * 5 * 60_000 + 30_000);
      await service.from("scan_jobs").update({ run_after: new Date().toISOString() }).eq("id", job.jobId);
    }
    await runWorker(60_000, deps);

    const row = await readJob(job.jobId);
    expect(row).toMatchObject({ status: "failed", attempts: 3, credits_charged: 0 });
    expect(row.error).toContain("Every check failed: openai: No recorded openai answers");
    expect(deps.ran).toEqual([job.jobId, job.jobId, job.jobId]);
    // Each attempt scanned again under a fresh hold, and every hold was released.
    const holds = await service.from("credit_holds").select("status, captured").eq("agency_id", agency.agencyId);
    expect(holds.data).toHaveLength(3);
    expect(holds.data!.every((h) => h.status === "closed" && h.captured === 0)).toBe(true);
    expect((await getBalance(agency.agencyId))?.balance).toBe(100);
  }, 60_000);
});

describe("reset_stuck_jobs", () => {
  it("puts jobs running for over 10 minutes back in the queue, and fails one out of attempts", async () => {
    const agency = await createTestAgency();
    const [stuck, lastTry, recent] = await Promise.all([queueTestJob(agency), queueTestJob(agency), queueTestJob(agency)]);
    const eleven = new Date(Date.now() - 11 * 60_000).toISOString();
    await service.from("scan_jobs").update({ status: "running", attempts: 1, locked_at: eleven }).eq("id", stuck.jobId);
    await service.from("scan_jobs").update({ status: "running", attempts: 3, locked_at: eleven }).eq("id", lastTry.jobId);
    await service.from("scan_jobs").update({ status: "running", attempts: 1, locked_at: new Date().toISOString() }).eq("id", recent.jobId);

    expect(await resetStuckJobs()).toBeGreaterThanOrEqual(2);
    expect(await readJob(stuck.jobId)).toMatchObject({ status: "queued", attempts: 1 });
    expect(await readJob(lastTry.jobId)).toMatchObject({ status: "failed", error: "The scan stopped without finishing 3 times." });
    expect(await readJob(recent.jobId)).toMatchObject({ status: "running" });
  });
});
