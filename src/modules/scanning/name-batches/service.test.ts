import { describe, expect, it, vi } from "vitest";
import type { Extraction } from "../extract";
import { mentionTargets } from "../recount/service";
import { BATCH_GIVE_UP_MS, batchesNames, collectNames, submitNames, updateFor, type NameBatchClient, type NameBatchStore, type PendingRow } from "./service";

const targets = mentionTargets(
  { name: "Bean There Coffee", aliases: [], domain: "beanthere.example", city: "Testville", phone: null, hasWebsite: true },
  [{ name: "Rival Roasters", aliases: [], domain: null, phone: null, city: "Testville" }],
);
const names = (list: string[]): Extraction => ({
  promptVersion: "extract-names.v1",
  model: "claude-haiku-4-5",
  names: list.map((name, i) => ({ name, position: i + 1 })),
  usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 10, searchCalls: 0 },
  costUsd: 0.00005,
});
const row = (id: string, extracted: unknown = null): PendingRow => ({
  id,
  business_id: "b1",
  answer_text: "Try Rival Roasters downtown, or Bean There Coffee for a quiet table.",
  extracted_names: extracted,
  business_mentioned: false,
  mention_position: null,
  competitors_mentioned: [],
});

function memoryStore(rows: PendingRow[], open: { submittedAt?: string } = {}) {
  const batches: { id: string; status: string; error?: string | null }[] = [];
  const usage: string[] = [];
  const store: NameBatchStore = {
    insert: vi.fn(async (b) => void batches.push({ id: `row${batches.length}`, status: b.status, error: b.error })),
    open: vi.fn(async () =>
      batches.filter((b) => b.status === "submitted").map((b) => ({ id: b.id, batchId: "msgbatch_1", runId: "r1", resultIds: rows.map((r) => r.id), submittedAt: open.submittedAt ?? new Date().toISOString() })),
    ),
    rows: vi.fn(async () => rows),
    business: vi.fn(async () => ({ targets, ownerUserId: "u1" })),
    saveNames: vi.fn(async (u) => {
      const r = rows.find((x) => x.id === u.id)!;
      if (r.extracted_names != null) return false;
      r.extracted_names = u.fields.extracted_names;
      r.business_mentioned = u.fields.business_mentioned;
      return true;
    }),
    recordUsage: vi.fn(async (u) => void usage.push(u.extraction.model)),
    touch: vi.fn(async () => undefined),
    close: vi.fn(async (id, status, error) => {
      const b = batches.find((x) => x.id === id && x.status === "submitted");
      if (!b) return false;
      Object.assign(b, { status, error });
      return true;
    }),
  };
  return { store, batches, usage };
}

describe("batchesNames", () => {
  it("only scheduled scans of real agencies with the flag on", () => {
    expect(batchesNames({ enabled: true, priority: 0, isTest: false })).toBe(true);
    expect(batchesNames({ enabled: false, priority: 0, isTest: false })).toBe(false);
    expect(batchesNames({ enabled: true, priority: 100, isTest: false })).toBe(false);
    expect(batchesNames({ enabled: true, priority: 0, isTest: true })).toBe(false);
  });
});

describe("updateFor", () => {
  it("adds the names and checks the mentions again with the scan's rules", () => {
    const update = updateFor(row("a"), { extractions: new Map([["a", names(["Rival Roasters", "Bean There Coffee"])]]), failed: [] }, targets);
    expect(update?.fields.business_mentioned).toBe(true);
    expect(update?.fields.extracted_names).toMatchObject({ promptVersion: "extract-names.v1" });
  });

  it("leaves a check that already has names, or got none back", () => {
    const outcome = { extractions: new Map([["a", names(["Rival Roasters"])]]), failed: [] };
    expect(updateFor(row("a", { promptVersion: "x", names: [] }), outcome, targets)).toBeNull();
    expect(updateFor(row("b"), outcome, targets)).toBeNull();
  });
});

describe("submitNames", () => {
  it("saves the batch to collect later", async () => {
    const { store, batches } = memoryStore([row("a")]);
    const client: NameBatchClient = { submit: vi.fn(async () => ({ batchId: "msgbatch_1", outcome: null })), collect: vi.fn() };
    await submitNames("r1", [{ checkId: "a", answer: "x" }], client, store);
    expect(batches).toEqual([{ id: "row0", status: "submitted", error: undefined }]);
    expect(store.saveNames).not.toHaveBeenCalled();
  });

  it("saves names at once when the batch could not be created and the backup ran (D-84)", async () => {
    const rows = [row("a"), row("b")];
    const { store, batches, usage } = memoryStore(rows);
    const outcome = { extractions: new Map([["a", names(["Bean There Coffee"])]]), failed: [{ customId: "b", reason: "backup down", retryable: true }] };
    const client: NameBatchClient = { submit: vi.fn(async () => ({ batchId: null, outcome })), collect: vi.fn() };
    await submitNames("r1", [{ checkId: "a", answer: "x" }, { checkId: "b", answer: "y" }], client, store);
    expect(rows[0].extracted_names).not.toBeNull();
    expect(rows[1].extracted_names).toBeNull();
    expect(usage).toHaveLength(1);
    expect(batches[0]).toMatchObject({ status: "collected", error: expect.stringContaining("1 answer(s) kept text-only names") });
  });
});

describe("collectNames", () => {
  const done = (ids: string[]) => ({ extractions: new Map(ids.map((id) => [id, names(["Rival Roasters"])])), failed: [] });

  it("waits while the batch is still running", async () => {
    const { store, batches } = memoryStore([row("a")]);
    batches.push({ id: "row0", status: "submitted" });
    const client: NameBatchClient = { submit: vi.fn(), collect: vi.fn(async () => null) };
    expect(await collectNames(new Date(), client, store)).toBe(0);
    expect(store.touch).toHaveBeenCalledWith("row0");
    expect(batches[0].status).toBe("submitted");
  });

  it("gives up on a batch past 26 hours; its answers keep text-only names", async () => {
    const { store, batches } = memoryStore([row("a")], { submittedAt: new Date(Date.now() - BATCH_GIVE_UP_MS - 1000).toISOString() });
    batches.push({ id: "row0", status: "submitted" });
    const client: NameBatchClient = { submit: vi.fn(), collect: vi.fn(async () => null) };
    expect(await collectNames(new Date(), client, store)).toBe(1);
    expect(batches[0].status).toBe("failed");
  });

  it("never applies names or records cost twice when two runs collect the same batch", async () => {
    const rows = [row("a"), row("b")];
    const { store, batches, usage } = memoryStore(rows);
    batches.push({ id: "row0", status: "submitted" });
    const client: NameBatchClient = { submit: vi.fn(), collect: vi.fn(async (_id, answers) => done([...answers.keys()])) };
    await Promise.all([collectNames(new Date(), client, store), collectNames(new Date(), client, store)]);
    expect(usage).toHaveLength(2);
    expect(batches[0].status).toBe("collected");
  });

  it("keeps a batch open after an API error and tries again next run", async () => {
    const { store, batches } = memoryStore([row("a")]);
    batches.push({ id: "row0", status: "submitted" });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const client: NameBatchClient = { submit: vi.fn(), collect: vi.fn(async () => Promise.reject(new Error("529 overloaded"))) };
    expect(await collectNames(new Date(), client, store)).toBe(0);
    expect(batches[0].status).toBe("submitted");
    error.mockRestore();
  });
});
