import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { captureCredits, holdCredits } from "@/modules/credits";
import { runScan } from "@/modules/scanning";
import { finishJob, releaseOrphanHolds, resetStuckJobs, retryFailedJob } from "./dal";
import { createTestAgency, deleteTestUsers, readJob, recordedDir, service } from "./jobs.test-helpers";
import { balanceOf, business, hold, runLikeWorker, runningJob } from "./scan-safety.test-helpers";

// Fix list Step 2 (migration 050) against the local database: A5 credit holds, B3 retries, B4 heartbeat.
// Test agencies only, with recorded answers: no AI calls (D-61).
vi.mock("@/lib/env", async (importOriginal) => {
  const { env } = await importOriginal<typeof import("@/lib/env")>();
  return { env: { ...env, WORKER_SECRET: "x", WORKER_TIME_BUDGET_SECONDS: 60 } };
});
afterAll(deleteTestUsers);

describe("A5: a job that ends failed releases its hold", () => {
  it("finishJob(failed) returns the hold: what was captured stays charged, the rest comes back", async () => {
    const agency = await createTestAgency(100);
    const job = await runningJob(agency, await business(agency));
    const holdId = await holdCredits(agency.agencyId, 10, job.id);
    expect(await balanceOf(agency.agencyId)).toBe(90);
    expect(await captureCredits(holdId, [randomUUID(), randomUUID(), randomUUID()])).toBe(3);

    expect(await finishJob(job, { status: "failed", error: "database went away" }, new Date())).toBe(true);
    expect(await hold(holdId)).toMatchObject({ status: "closed", captured: 3, released: 7 });
    expect(await balanceOf(agency.agencyId)).toBe(97);
    expect(await readJob(job.id)).toMatchObject({ status: "failed", error: "database went away" });
  });

  it("only the worker holding the claim can end the job", async () => {
    const agency = await createTestAgency(100);
    const job = await runningJob(agency, await business(agency), 2);
    const holdId = await holdCredits(agency.agencyId, 5, job.id);
    expect(await finishJob({ ...job, attempts: 1 }, { status: "failed", error: "x" }, new Date())).toBe(false);
    expect((await hold(holdId)).status).toBe("open");
    expect(await readJob(job.id)).toMatchObject({ status: "running" });
  });

  it("reset_stuck_jobs releases the hold of a job it fails after 3 attempts", async () => {
    const agency = await createTestAgency(100);
    const job = await runningJob(agency, await business(agency), 3);
    const holdId = await holdCredits(agency.agencyId, 12, job.id);
    await service.from("scan_jobs").update({ locked_at: new Date(Date.now() - 25 * 60_000).toISOString() }).eq("id", job.id);

    expect(await resetStuckJobs()).toBeGreaterThanOrEqual(1);
    expect(await readJob(job.id)).toMatchObject({ status: "failed", error: "The scan stopped without finishing 3 times." });
    expect(await hold(holdId)).toMatchObject({ status: "closed", released: 12 });
    expect(await balanceOf(agency.agencyId)).toBe(100);
  });

  it("the safety sweep releases open holds of failed, skipped and done jobs, and leaves a waiting job's hold", async () => {
    const agency = await createTestAgency(200);
    const holds: Record<string, string> = {};
    for (const status of ["failed", "skipped", "done", "queued"]) {
      const { data: job } = await service
        .from("scan_jobs")
        .insert({ agency_id: agency.agencyId, business_id: await business(agency), status })
        .select("id")
        .single()
        .throwOnError();
      holds[status] = await holdCredits(agency.agencyId, 10, job.id);
    }
    expect(await releaseOrphanHolds()).toBeGreaterThanOrEqual(3);
    for (const status of ["failed", "skipped", "done"]) expect((await hold(holds[status])).status).toBe("closed");
    expect((await hold(holds.queued)).status).toBe("open");
    expect(await balanceOf(agency.agencyId)).toBe(190);
  });

  it("admin Retry gives a failed job whose hold was released a fresh hold, and charges saved checks only once", async () => {
    const agency = await createTestAgency(100);
    const job = await runningJob(agency, await business(agency));
    const holdId = await holdCredits(agency.agencyId, 10, job.id);
    await captureCredits(holdId, [randomUUID()]);
    await finishJob(job, { status: "failed", error: "x" }, new Date());

    expect(await retryFailedJob(job.id)).toBe("queued");
    expect(await readJob(job.id)).toMatchObject({ status: "queued", attempts: 0, hold_id: null });
    expect(await holdCredits(agency.agencyId, 10, job.id)).not.toBe(holdId);
  });
});

describe("B3: a retry that needs more checks grows its hold", () => {
  it("returns the same open hold, larger, so the retry can finish", async () => {
    const agency = await createTestAgency(200);
    const job = await runningJob(agency, await business(agency));
    const first = await holdCredits(agency.agencyId, 12, job.id);
    await captureCredits(first, [randomUUID(), randomUUID()]);

    // Questions were added since: 12 checks became 36.
    expect(await holdCredits(agency.agencyId, 36, job.id)).toBe(first);
    expect(await hold(first)).toMatchObject({ amount: 36, captured: 2, status: "open" });
    // Never smaller, and never reopened once closed.
    expect(await holdCredits(agency.agencyId, 5, job.id)).toBe(first);
    expect((await hold(first)).amount).toBe(36);
  });

  it("a full scan retried with 3 more questions finishes and charges every check once", async () => {
    const agency = await createTestAgency(300);
    const id = await business(agency, {}, 3);
    const job = await runningJob(agency, id);
    const dir = recordedDir();
    // Attempt 1 held for 3 questions x 3 models, then the worker died.
    await holdCredits(agency.agencyId, 9, job.id);
    await service.from("tracked_prompts").insert(Array.from({ length: 3 }, (_, i) => ({ business_id: id, prompt: `Extra ${i} coffee near me?` }))).throwOnError();

    const { outcome } = await runLikeWorker({ ...job, attempts: 1 }, dir);
    expect(outcome).toMatchObject({ status: "done", checks: 18, charged: 18 });
    expect((await readJob(job.id)).status).toBe("done");
    expect(await balanceOf(agency.agencyId)).toBe(282);
  });
});

describe("B4: a running scan shows it is alive", () => {
  it("refreshes locked_at as its checks finish, so reset_stuck_jobs leaves a long scan alone", async () => {
    const agency = await createTestAgency(100);
    const job = await runningJob(agency, await business(agency, {}, 4));
    const old = new Date(Date.now() - 30 * 60_000).toISOString();
    await service.from("scan_jobs").update({ locked_at: old }).eq("id", job.id);

    // A clock that jumps 2 minutes per look, as a scan that takes a while would see.
    let t = Date.now();
    const now = () => new Date((t += 120_000));
    await runScan(job.id, { recordedDir: recordedDir(), now });
    const { data } = await service.from("scan_jobs").select("locked_at").eq("id", job.id).single().throwOnError();
    expect(new Date(data.locked_at!).getTime()).toBeGreaterThan(Date.now() - 60_000);
  });
});

