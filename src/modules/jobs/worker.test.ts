import { describe, expect, it, vi } from "vitest";
import type { ScanOutcome } from "@/modules/scanning";
import type { ClaimedJob, JobUpdate } from "./dal";
import { handleWorkerRequest, jobUpdateFor, runWorker, type WorkerDeps } from "./worker";

const NOW = new Date("2026-09-27T12:00:00Z");
const job = (attempts: number, creditsCharged = 0): ClaimedJob => ({ id: `job-${attempts}`, attempts, creditsCharged });
const done = (charged: number): ScanOutcome => ({ status: "done", runId: "r", checks: 36, failed: 0, charged, released: 36 - charged, errors: [] });
const allFailed: ScanOutcome = { status: "failed", runId: "r", checks: 2, failed: 2, charged: 0, released: 2, errors: ["openai returned 503", "openai returned 503"] };

describe("jobUpdateFor", () => {
  it("marks a finished scan done and adds what earlier attempts charged", () => {
    expect(jobUpdateFor(done(30), job(2, 6), NOW)).toEqual({ status: "done", creditsCharged: 36, error: null });
  });

  it("treats a hold closed by an earlier attempt as done", () => {
    const update = jobUpdateFor({ status: "skipped", reason: "This scan already finished." }, job(2, 36), NOW);
    expect(update).toEqual({ status: "done", creditsCharged: 36, error: null });
  });

  it("fails a skipped scan straight away with its reason", () => {
    const update = jobUpdateFor({ status: "skipped", reason: "You're out of credits." }, job(1), NOW);
    expect(update).toEqual({ status: "failed", error: "You're out of credits." });
  });

  it("retries after 5 minutes times the attempts, then fails on the third", () => {
    expect(jobUpdateFor(allFailed, job(1), NOW)).toEqual({
      status: "queued",
      runAfter: new Date("2026-09-27T12:05:00Z"),
      error: "Every check failed: openai returned 503",
    });
    expect(jobUpdateFor({ status: "error", error: "db down" }, job(2), NOW)).toMatchObject({
      status: "queued",
      runAfter: new Date("2026-09-27T12:10:00Z"),
    });
    expect(jobUpdateFor(allFailed, job(3), NOW)).toEqual({ status: "failed", error: "Every check failed: openai returned 503" });
  });
});

function fakeDeps(queue: string[], opts: { runMs?: number; clock?: { t: number } } = {}) {
  const clock = opts.clock ?? { t: NOW.getTime() };
  const finished: { job: ClaimedJob; update: JobUpdate }[] = [];
  let running = 0;
  let maxRunning = 0;
  const deps: WorkerDeps = {
    claim: vi.fn(async (limit: number) => queue.splice(0, limit).map((id) => ({ id, attempts: 1, creditsCharged: 0 }))),
    run: async (id) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 5));
      clock.t += opts.runMs ?? 0;
      running--;
      if (id.startsWith("bad")) throw new Error("database went away");
      return done(36);
    },
    finish: async (j, update) => {
      finished.push({ job: j, update });
      return true;
    },
    now: () => new Date(clock.t),
  };
  return { deps, finished, maxRunning: () => maxRunning };
}

describe("runWorker", () => {
  it("claims 10 at a time, runs each batch in parallel, and keeps going until the queue is empty", async () => {
    const queue = Array.from({ length: 23 }, (_, i) => (i === 4 ? "bad-4" : `job-${i}`));
    const { deps, finished, maxRunning } = fakeDeps(queue);
    const summary = await runWorker(600_000, deps);
    expect(summary).toEqual({ claimed: 23, done: 22, retrying: 1, failed: 0, lost: 0, stoppedForTime: false });
    expect(deps.claim).toHaveBeenCalledWith(10);
    expect(maxRunning()).toBe(10);
    expect(finished.find((f) => f.job.id === "bad-4")?.update).toMatchObject({ status: "queued", error: "database went away" });
  });

  it("stops claiming once the time budget is nearly used", async () => {
    const { deps } = fakeDeps(Array.from({ length: 50 }, (_, i) => `job-${i}`), { runMs: 200_000 });
    // Each batch moves the clock 10 runs x 200 s; the first batch already passes 90% of a 600 s budget.
    const summary = await runWorker(600_000, deps);
    expect(summary.claimed).toBe(10);
    expect(summary.stoppedForTime).toBe(true);
  });

  it("counts a job another worker took over as lost", async () => {
    const { deps } = fakeDeps(["job-1"]);
    deps.finish = async () => false;
    expect(await runWorker(600_000, deps)).toMatchObject({ claimed: 1, done: 0, lost: 1 });
  });
});

describe("handleWorkerRequest", () => {
  it("accepts only POST", async () => {
    const res = await handleWorkerRequest(new Request("http://x/worker", { method: "GET" }));
    expect(res.status).toBe(405);
  });

  it("refuses a missing or wrong secret without claiming anything", async () => {
    const { deps } = fakeDeps(["job-1"]);
    for (const headers of [{}, { "x-worker-secret": "wrong" }] as Record<string, string>[]) {
      const res = await handleWorkerRequest(new Request("http://x/worker", { method: "POST", headers }), deps);
      expect(res.status).toBe(401);
    }
    expect(deps.claim).not.toHaveBeenCalled();
  });
});

describe("why competitors win after a scan (B-51)", () => {
  it("explains each finished scan, and a failed explanation leaves the job done", async () => {
    const { deps, finished } = fakeDeps(["a", "b"]);
    const explained: string[] = [];
    deps.explain = vi.fn(async (runId: string) => {
      explained.push(runId);
      if (explained.length === 2) throw new Error("Claude returned 529");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const summary = await runWorker(60_000, deps);
    expect(summary).toMatchObject({ done: 2, failed: 0 });
    expect(explained).toEqual(["r", "r"]);
    expect(finished.every((f) => f.update.status === "done")).toBe(true);
  });

  it("does not explain a scan that did not finish", async () => {
    const { deps } = fakeDeps(["bad-1"]);
    deps.explain = vi.fn(async () => {});
    await runWorker(60_000, deps);
    expect(deps.explain).not.toHaveBeenCalled();
  });
});
