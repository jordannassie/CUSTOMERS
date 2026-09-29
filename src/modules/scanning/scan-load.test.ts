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

// E2E-0929 BUG-3: many scans of one agency at once, against the local database. Every capture locks the agency
// row, so the test counts capture calls per hold and can make the next one fail like a statement timeout.
const captures = vi.hoisted(() => ({ total: 0, maxPerHold: 0, running: new Map<string, number>(), timeouts: 0 }));

vi.mock("@/modules/credits", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/modules/credits")>();
  const counted =
    <A extends unknown[], R>(fn: (holdId: string, ...rest: A) => Promise<R>) =>
    async (holdId: string, ...rest: A): Promise<R> => {
      captures.total++;
      const running = (captures.running.get(holdId) ?? 0) + 1;
      captures.running.set(holdId, running);
      captures.maxPerHold = Math.max(captures.maxPerHold, running);
      try {
        if (captures.timeouts > 0) {
          captures.timeouts--;
          throw new Error("capture failed: canceling statement due to statement timeout");
        }
        return await fn(holdId, ...rest);
      } finally {
        captures.running.set(holdId, captures.running.get(holdId)! - 1);
      }
    };
  return { ...real, captureCredit: counted(real.captureCredit), captureCredits: counted(real.captureCredits) };
});

afterAll(deleteScanUsers);

let aiAttempts: string[];
beforeEach(() => {
  aiAttempts = blockAiHosts();
  Object.assign(captures, { total: 0, maxPerHold: 0, running: new Map(), timeouts: 0 });
});
afterEach(() => {
  vi.restoreAllMocks();
  expect(aiAttempts).toEqual([]);
});

const checkRunner = (p: ProviderId) => answeringRunner(p);

async function chargedPerJob(jobIds: string[]) {
  const [jobs, holds] = await Promise.all([
    service.from("scan_jobs").select("credits_charged").in("id", jobIds),
    service.from("credit_holds").select("captured").in("scan_job_id", jobIds),
  ]);
  if (jobs.error || holds.error) throw jobs.error ?? holds.error;
  return { jobs: jobs.data.map((j) => j.credits_charged), holds: holds.data.map((h) => h.captured) };
}

describe("scans under load (E2E-0929)", () => {
  it("runs 10 scans of one agency at once with one capture call per scan at a time and exact totals", async () => {
    const agency = await createScanAgency({ credits: 400 });
    const businesses = await Promise.all(Array.from({ length: 10 }, () => createScanBusiness(agency)));
    const jobs = await Promise.all(businesses.map(newJob));

    const outcomes = await Promise.all(jobs.map((job) => runScan(job, { checkRunner, extractNames })));

    for (const outcome of outcomes) expect(outcome).toMatchObject({ status: "done", checks: 36, failed: 0, charged: 36 });
    expect(captures.maxPerHold).toBe(1);
    expect(captures.total).toBeLessThan(360);
    expect((await getBalance(agency.agencyId)).balance).toBe(40);
    const { count } = await service
      .from("credit_transactions")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency.agencyId)
      .eq("kind", "capture");
    expect(count).toBe(360);
    const charged = await chargedPerJob(jobs);
    expect(charged.jobs).toEqual(Array(10).fill(36));
    expect(charged.holds).toEqual(Array(10).fill(36));
  });

  it("tries a timed-out capture again and still charges each check once", async () => {
    const agency = await createScanAgency();
    const job = await newJob(await createScanBusiness(agency));
    captures.timeouts = 1;

    const outcome = await runScan(job, { checkRunner, extractNames });

    expect(outcome).toMatchObject({ status: "done", checks: 36, failed: 0, charged: 36, released: 0 });
    expect((await getBalance(agency.agencyId)).balance).toBe(64);
  });
});
