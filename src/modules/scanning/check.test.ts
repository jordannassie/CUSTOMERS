import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runOneCheck, type CheckContext, type CheckTask } from "./check";
import type { ExtractNames } from "./extract";
import { ProviderError } from "./providers/request";
import type { CheckResult, RunCheck } from "./providers/types";

// BUG-281: only the provider call can fail a check as an AI failure. The database is mocked, so each write can be
// made to fail on its own; the model is a stub, so no real AI call is made.
const db = vi.hoisted(() => ({
  findCachedAnswer: vi.fn(),
  upsertCachedAnswer: vi.fn(),
  insertCheckUsage: vi.fn(),
  saveExtractedNames: vi.fn(),
  recordProviderError: vi.fn(),
  saveCheckResult: vi.fn(),
  insertExtractionUsage: vi.fn(),
}));
vi.mock("./dal", () => ({
  findCachedAnswer: db.findCachedAnswer,
  upsertCachedAnswer: db.upsertCachedAnswer,
  insertCheckUsage: db.insertCheckUsage,
  saveExtractedNames: db.saveExtractedNames,
}));
vi.mock("./runs/dal", () => ({
  recordProviderError: db.recordProviderError,
  saveCheckResult: db.saveCheckResult,
  insertExtractionUsage: db.insertExtractionUsage,
}));

const CACHED_AT = "2026-10-29T10:00:00.000Z";
const task: CheckTask = { checkId: "c1", promptId: "p1", provider: "anthropic", question: "Best coffee shop in Testville?" };
const answer: CheckResult = {
  answerText: "Try Bean There Coffee or Rival Roasters.",
  citations: [],
  model: "claude-haiku-4-5",
  usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 50, searchCalls: 1 },
  costUsd: 0.01,
  latencyMs: 5,
};
const extractNames = vi.fn<ExtractNames>(async () => ({
  promptVersion: "extract-names.v1",
  model: "claude-haiku-4-5",
  names: [{ name: "Bean There Coffee", position: 1 }],
  usage: { inputTokens: 10, cachedInputTokens: 0, outputTokens: 10, searchCalls: 0 },
  costUsd: 0.0001,
}));

function ctx(runner: RunCheck): CheckContext {
  return {
    runId: "r1",
    businessId: "b1",
    ownerUserId: "u1",
    business: { name: "Bean There Coffee" },
    competitors: [{ name: "Rival Roasters" }],
    location: { city: "Testville", region: "CA", country: "US" },
    isTest: false,
    runner,
    extractNames,
  };
}

const dbDown = () => Promise.reject(new Error("Could not reach the database"));
let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  for (const fn of Object.values(db)) fn.mockReset().mockResolvedValue(undefined);
  db.findCachedAnswer.mockResolvedValue(null);
  db.upsertCachedAnswer.mockResolvedValue(CACHED_AT);
  extractNames.mockClear();
  errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorLog.mockRestore());

const saved = () => db.saveCheckResult.mock.calls[0][0] as { extractedNames: unknown; cached: boolean };

describe("runOneCheck when the database fails (BUG-281)", () => {
  it("throws a failed usage insert out of the check, never as a provider error", async () => {
    db.insertCheckUsage.mockImplementation(dbDown);
    const run = vi.fn<RunCheck>(async () => answer);

    await expect(runOneCheck(task, ctx(run))).rejects.toThrow("Could not reach the database");
    expect(run).toHaveBeenCalledTimes(1);
    expect(db.recordProviderError).not.toHaveBeenCalled();
    expect(db.saveCheckResult).not.toHaveBeenCalled();
    // The answer was cached first, so the job's retry reuses it instead of asking the model again.
    expect(db.upsertCachedAnswer).toHaveBeenCalledTimes(1);
  });

  it("still uses the answer when the cache write fails", async () => {
    db.upsertCachedAnswer.mockImplementation(dbDown);
    const outcome = await runOneCheck(task, ctx(vi.fn<RunCheck>(async () => answer)));

    expect(outcome).toEqual({ ok: true, cached: false });
    expect(db.recordProviderError).not.toHaveBeenCalled();
    expect(db.insertCheckUsage).toHaveBeenCalledWith(expect.objectContaining({ cached: false, costUsd: 0.01 }));
    // No cached row to put the names on, but the check keeps them.
    expect(db.saveExtractedNames).not.toHaveBeenCalled();
    expect(saved().extractedNames).toMatchObject({ names: expect.any(Array) });
  });

  it("asks the model when the cache read fails", async () => {
    db.findCachedAnswer.mockImplementation(dbDown);
    const run = vi.fn<RunCheck>(async () => answer);
    const outcome = await runOneCheck(task, ctx(run));

    expect(outcome).toEqual({ ok: true, cached: false });
    expect(run).toHaveBeenCalledTimes(1);
    expect(db.recordProviderError).not.toHaveBeenCalled();
  });

  it("keeps the extracted names when saving them or their cost fails", async () => {
    db.saveExtractedNames.mockImplementation(dbDown);
    db.insertExtractionUsage.mockImplementation(dbDown);
    const outcome = await runOneCheck(task, ctx(vi.fn<RunCheck>(async () => answer)));

    expect(outcome).toEqual({ ok: true, cached: false });
    expect(db.saveExtractedNames).toHaveBeenCalledTimes(1);
    expect(db.insertExtractionUsage).toHaveBeenCalledTimes(1);
    expect(saved().extractedNames).toMatchObject({ names: expect.any(Array) });
    expect(db.recordProviderError).not.toHaveBeenCalled();
  });

  it("drops only the names when the extraction AI call fails", async () => {
    extractNames.mockRejectedValueOnce(new Error("AI unavailable"));
    const outcome = await runOneCheck(task, ctx(vi.fn<RunCheck>(async () => answer)));

    expect(outcome).toEqual({ ok: true, cached: false });
    expect(saved().extractedNames).toBeNull();
    expect(db.insertExtractionUsage).not.toHaveBeenCalled();
  });
});

describe("runOneCheck when the provider fails", () => {
  it("logs a provider error and says how the call failed", async () => {
    const run = vi.fn<RunCheck>(async () => {
      throw new ProviderError({ provider: "anthropic", kind: "server", status: 529, attempts: 3, message: "anthropic returned 529: overloaded" });
    });
    const outcome = await runOneCheck(task, ctx(run));

    expect(outcome).toMatchObject({ ok: false, kind: "server", reason: "anthropic returned 529: overloaded" });
    expect(outcome).not.toHaveProperty("outage");
    expect(db.recordProviderError).toHaveBeenCalledWith("anthropic", "anthropic returned 529: overloaded");
    expect(db.insertCheckUsage).not.toHaveBeenCalled();
  });
});

// QA round 2, item 4: an answer that says it has no web access and cites nothing is a failed check.
describe("runOneCheck when the AI answers without the web", () => {
  const refusal: CheckResult = { ...answer, answerText: "I don't have access to current, real-time information about coffee shops in Testville." };

  it("tries once more, then fails without saving, caching or charging the answer", async () => {
    const run = vi.fn<RunCheck>(async () => refusal);
    const outcome = await runOneCheck(task, ctx(run));

    expect(run).toHaveBeenCalledTimes(2);
    expect(outcome).toMatchObject({ ok: false, kind: "search" });
    expect(db.upsertCachedAnswer).not.toHaveBeenCalled();
    expect(db.insertCheckUsage).not.toHaveBeenCalled();
    expect(db.saveCheckResult).not.toHaveBeenCalled();
  });

  it("keeps the answer when the second try looks things up", async () => {
    const run = vi.fn<RunCheck>().mockResolvedValueOnce(refusal).mockResolvedValueOnce(answer);
    const outcome = await runOneCheck(task, ctx(run));

    expect(outcome).toEqual({ ok: true, cached: false });
    expect(db.saveCheckResult).toHaveBeenCalledTimes(1);
  });

  it("fails a refusal saved in the cache before this rule, without asking the model or charging", async () => {
    db.findCachedAnswer.mockResolvedValue({
      answer: refusal.answerText,
      citations: [],
      extractedNames: null,
      model: "claude-haiku-4-5",
      createdAt: CACHED_AT,
    });
    const run = vi.fn<RunCheck>(async () => answer);
    const outcome = await runOneCheck(task, ctx(run));

    expect(run).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ ok: false, kind: "search" });
    expect(db.insertCheckUsage).not.toHaveBeenCalled();
    expect(db.saveCheckResult).not.toHaveBeenCalled();
  });
});

// F-39: a scheduled scan with name batches on queues answers instead of reading names live.
describe("runOneCheck with deferred names", () => {
  it("queues a new answer for the batch and saves it with text-only mentions", async () => {
    const deferNames = vi.fn();
    const outcome = await runOneCheck(task, { ...ctx(vi.fn<RunCheck>(async () => answer)), deferNames });
    expect(outcome).toEqual({ ok: true, cached: false });
    expect(deferNames).toHaveBeenCalledWith("c1", answer.answerText);
    expect(extractNames).not.toHaveBeenCalled();
    expect(saved().extractedNames).toBeNull();
  });

  it("uses names already saved on a cached answer instead of queueing it", async () => {
    db.findCachedAnswer.mockResolvedValue({
      answer: answer.answerText,
      citations: [],
      extractedNames: { promptVersion: "extract-names.v1", model: "claude-haiku-4-5", names: [{ name: "Bean There Coffee", position: 1 }] },
      model: "claude-haiku-4-5",
      createdAt: CACHED_AT,
    });
    const deferNames = vi.fn();
    await runOneCheck(task, { ...ctx(vi.fn<RunCheck>(async () => answer)), deferNames });
    expect(deferNames).not.toHaveBeenCalled();
    expect(saved().extractedNames).not.toBeNull();
  });
});
