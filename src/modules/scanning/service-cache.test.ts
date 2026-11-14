import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBalance } from "@/modules/credits";
import type { ProviderId, RunCheck } from "./providers/types";
import { runScan } from "./service";
import {
  answeringRunner,
  blockAiHosts,
  createScanAgency,
  createScanBusiness,
  deleteScanUsers,
  extractNames,
  failingRunner,
  memoryOutage,
  newJob,
  service,
} from "./service.test-helpers";

// Answers reused from the shared cache are free (D-24, changed 2026-10-20 at the owner's request): only new answers
// are charged and the rest of the hold goes back. Local database, mocked providers.
afterAll(deleteScanUsers);

let aiAttempts: string[];
beforeEach(() => {
  aiAttempts = blockAiHosts();
});
afterEach(() => {
  vi.restoreAllMocks();
  expect(aiAttempts).toEqual([]);
});

const balance = async (agencyId: string) => (await getBalance(agencyId)).balance;

function runners(overrides: Partial<Record<ProviderId, RunCheck>> = {}) {
  const all = {
    openai: answeringRunner("openai"),
    anthropic: answeringRunner("anthropic"),
    perplexity: answeringRunner("perplexity"),
    ...overrides,
  };
  return { all, checkRunner: (p: ProviderId) => all[p], claudeOutage: memoryOutage().store };
}

async function results(runId: string) {
  const { data } = await service.from("visibility_results").select("cached, cost_usd").eq("run_id", runId);
  return data!;
}

describe("runScan with cached answers", () => {
  it("serves a second business in the same city from the cache and charges nothing for it (D-24, 2026-10-20)", async () => {
    const agency = await createScanAgency();
    const first = await createScanBusiness(agency);
    const firstJob = await newJob(first);
    await runScan(firstJob, { ...runners(), extractNames });

    const other = await createScanAgency();
    const second = await createScanBusiness(other, first.city);
    const live = runners();
    extractNames.mockClear();
    const outcome = await runScan(await newJob(second), { checkRunner: live.checkRunner, extractNames });

    expect(outcome).toMatchObject({ status: "done", charged: 0, released: 36 });
    for (const run of Object.values(live.all)) expect(run).not.toHaveBeenCalled();
    // Names were stored with the cached answers, so the hit needs no new extraction.
    expect(extractNames).not.toHaveBeenCalled();
    if (outcome.status === "skipped") throw new Error("unexpected skip");
    const rows = await results(outcome.runId);
    expect(rows.every((r) => r.cached && Number(r.cost_usd) === 0)).toBe(true);
    expect(await balance(other.agencyId)).toBe(100);

    const { data: usage } = await service.from("usage_events").select("cached, estimated_cost_usd").eq("business_id", second.businessId);
    expect(usage).toHaveLength(36);
    expect(usage!.every((u) => u.cached && Number(u.estimated_cost_usd) === 0)).toBe(true);
  });

  it("charges only the new answers when some come from the cache", async () => {
    const agency = await createScanAgency();
    const first = await createScanBusiness(agency);
    // Claude fails for the first business, so only the ChatGPT and Perplexity answers are cached.
    await runScan(await newJob(first), { ...runners({ anthropic: failingRunner("anthropic") }), extractNames });

    const other = await createScanAgency();
    const second = await createScanBusiness(other, first.city);
    const live = runners();
    const outcome = await runScan(await newJob(second), { checkRunner: live.checkRunner, claudeOutage: live.claudeOutage, extractNames });

    expect(outcome).toMatchObject({ status: "done", checks: 36, failed: 0, charged: 12, released: 24 });
    expect(live.all.anthropic).toHaveBeenCalledTimes(12);
    expect(live.all.openai).not.toHaveBeenCalled();
    expect(await balance(other.agencyId)).toBe(88);
    const { data: job } = await service.from("scan_jobs").select("credits_charged").eq("business_id", second.businessId).single();
    expect(job!.credits_charged).toBe(12);
  });
});
