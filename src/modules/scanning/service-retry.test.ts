import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBalance } from "@/modules/credits";
import type { ProviderId } from "./providers/types";
import { runScan } from "./service";
import {
  answeringRunner,
  blockAiHosts,
  createScanAgency,
  createScanBusiness,
  deleteScanUsers,
  extractNames,
  newJob,
  service,
} from "./service.test-helpers";

// A database error while finishing the run (a dropped connection, a statement timeout) makes the worker run the
// job again. The real writes go through; a test can make the next one fail once.
const failNext = vi.hoisted(() => ({ finishRun: false, setNextScanAt: false }));
vi.mock("./runs/dal", async (importOriginal) => {
  const real = await importOriginal<typeof import("./runs/dal")>();
  return {
    ...real,
    finishRun: vi.fn(async (...args: Parameters<typeof real.finishRun>) => {
      if (failNext.finishRun) {
        failNext.finishRun = false;
        throw new Error("Could not finish the scan run: canceling statement due to statement timeout");
      }
      return real.finishRun(...args);
    }),
    setNextScanAt: vi.fn(async (...args: Parameters<typeof real.setNextScanAt>) => {
      if (failNext.setNextScanAt) {
        failNext.setNextScanAt = false;
        throw new Error("Could not set the next scan time: connection reset");
      }
      return real.setNextScanAt(...args);
    }),
  };
});

afterAll(deleteScanUsers);

let aiAttempts: string[];
beforeEach(() => {
  aiAttempts = blockAiHosts();
});
afterEach(() => {
  vi.restoreAllMocks();
  expect(aiAttempts).toEqual([]);
});

function runners() {
  const all = { openai: answeringRunner("openai"), anthropic: answeringRunner("anthropic"), perplexity: answeringRunner("perplexity") };
  return { all, checkRunner: (p: ProviderId) => all[p] };
}

async function afterRetry(fail: keyof typeof failNext) {
  const agency = await createScanAgency();
  const business = await createScanBusiness(agency);
  const job = await newJob(business);

  failNext[fail] = true;
  await expect(runScan(job, { ...runners(), extractNames })).rejects.toThrow(/Could not/);
  // The hold stays open, so the retry finishes the run instead of skipping it as already finished.
  const retryRunners = runners();
  const retry = await runScan(job, { checkRunner: retryRunners.checkRunner, extractNames });

  // Every check was saved the first time: the retry asks no AI again and charges nothing new.
  for (const run of Object.values(retryRunners.all)) expect(run).not.toHaveBeenCalled();
  expect(retry).toMatchObject({ status: "done", checks: 36, failed: 0, charged: 0, released: 0 });
  expect((await getBalance(agency.agencyId)).balance).toBe(64);
  if (retry.status === "skipped") throw new Error("unexpected skip");
  const { data: run } = await service.from("visibility_runs").select("status, checks_total").eq("id", retry.runId).single();
  expect(run).toEqual({ status: "completed", checks_total: 36 });
  const { data: biz } = await service.from("businesses").select("next_scan_at").eq("id", business.businessId).single();
  // Weekly: the 02:00 UTC run on the day a week from now (H1).
  expect(new Date(biz!.next_scan_at!).getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);

  // A third run finds the hold closed and leaves everything as it is.
  expect(await runScan(job, { ...runners(), extractNames })).toEqual({ status: "skipped", reason: "This scan already finished." });
  expect((await getBalance(agency.agencyId)).balance).toBe(64);
}

describe("runScan when finishing the run fails once", () => {
  it("finishes the run and sets the next scan on the retry, charging nothing twice (finishRun)", async () => {
    await afterRetry("finishRun");
  });

  it("finishes the run and sets the next scan on the retry, charging nothing twice (setNextScanAt)", async () => {
    await afterRetry("setNextScanAt");
  });
});
