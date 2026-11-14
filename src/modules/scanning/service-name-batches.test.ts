import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BatchOutcome, ExtractionBatchItem } from "./extract-batch";
import type { ProviderId } from "./providers/types";
import { runScan } from "./service";
import { liveNameBatchStore } from "./name-batches/dal";
import { collectNames, type NameBatchClient } from "./name-batches/service";
import { answeringRunner, blockAiHosts, createScanAgency, createScanBusiness, deleteScanUsers, extractNames, memoryOutage, newJob, service } from "./service.test-helpers";

// F-39: scheduled scans read names in one Message Batch, saved later; Run scan and the flag off read them live.
// Local database (migration 097), mocked providers and batch API: no AI call leaves the machine.
afterAll(deleteScanUsers);

let aiAttempts: string[];
beforeEach(() => {
  aiAttempts = blockAiHosts();
  extractNames.mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
  expect(aiAttempts).toEqual([]);
});

const NAMES = { promptVersion: "extract-names.v1", model: "claude-haiku-4-5", names: [{ name: "Bean There Coffee", position: 1 }, { name: "Rival Roasters", position: 2 }], usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 10, searchCalls: 0 }, costUsd: 0.00005 };

function deps(client: NameBatchClient | null) {
  const all = { openai: answeringRunner("openai"), anthropic: answeringRunner("anthropic"), perplexity: answeringRunner("perplexity") };
  return { checkRunner: (p: ProviderId) => all[p], claudeOutage: memoryOutage().store, extractNames, nameBatches: client ? { client, store: liveNameBatchStore } : null };
}

function fakeClient() {
  const submitted: string[][] = [];
  const client: NameBatchClient = {
    submit: vi.fn(async (items: ExtractionBatchItem[]) => {
      submitted.push(items.map((i) => i.customId));
      return { batchId: `msgbatch_${submitted.length}_${Date.now()}`, outcome: null };
    }),
    collect: vi.fn(async (_batchId: string, answers: Map<string, string>): Promise<BatchOutcome> => ({
      extractions: new Map([...answers.keys()].map((id) => [id, { ...NAMES }])),
      failed: [],
    })),
  };
  return { client, submitted };
}

async function namesOf(runId: string) {
  const { data } = await service.from("visibility_results").select("id, extracted_names").eq("run_id", runId);
  return data!;
}

async function batchesOf(runId: string) {
  const { data } = await service.from("name_extraction_batches").select("id, status, result_ids").eq("run_id", runId);
  return data!;
}

async function extractUsage(businessId: string) {
  const { data } = await service.from("usage_events").select("estimated_cost_usd, metadata").eq("business_id", businessId);
  return data!.filter((u) => JSON.stringify(u.metadata).includes("extract_names"));
}

describe("name batches on a scan (F-39)", () => {
  it("a scheduled scan queues every new answer in one batch, then a worker run saves the names once", async () => {
    const b = await createScanBusiness(await createScanAgency());
    const { client, submitted } = fakeClient();
    const outcome = await runScan(await newJob(b), deps(client));
    if (outcome.status === "skipped") throw new Error("unexpected skip");

    expect(extractNames).not.toHaveBeenCalled();
    expect(submitted).toHaveLength(1);
    const saved = await namesOf(outcome.runId);
    expect(submitted[0].sort()).toEqual(saved.map((r) => r.id).sort());
    expect(saved.every((r) => r.extracted_names === null)).toBe(true);
    expect(await batchesOf(outcome.runId)).toMatchObject([{ status: "submitted" }]);

    await collectNames(new Date(), client, liveNameBatchStore);
    const after = await namesOf(outcome.runId);
    expect(after.every((r) => (r.extracted_names as { names?: unknown[] } | null)?.names?.length === 2)).toBe(true);
    expect(await batchesOf(outcome.runId)).toMatchObject([{ status: "collected" }]);
    expect(await extractUsage(b.businessId)).toHaveLength(saved.length);

    // A second worker run finds nothing open and records nothing twice.
    await collectNames(new Date(), client, liveNameBatchStore);
    expect(await extractUsage(b.businessId)).toHaveLength(saved.length);
  });

  it("Run scan (manual priority) still reads names live and queues nothing", async () => {
    const b = await createScanBusiness(await createScanAgency());
    const job = await newJob(b);
    await service.from("scan_jobs").update({ priority: 100 }).eq("id", job);
    const { client, submitted } = fakeClient();
    const outcome = await runScan(job, deps(client));
    if (outcome.status === "skipped") throw new Error("unexpected skip");

    expect(submitted).toHaveLength(0);
    expect(extractNames).toHaveBeenCalled();
    expect(await batchesOf(outcome.runId)).toEqual([]);
  });

  it("with name batches off, a scheduled scan reads names live exactly as before", async () => {
    const b = await createScanBusiness(await createScanAgency());
    const outcome = await runScan(await newJob(b), deps(null));
    if (outcome.status === "skipped") throw new Error("unexpected skip");

    expect(extractNames).toHaveBeenCalled();
    expect((await namesOf(outcome.runId)).every((r) => r.extracted_names !== null)).toBe(true);
    expect(await batchesOf(outcome.runId)).toEqual([]);
  });
});
