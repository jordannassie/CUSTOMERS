import { describe, expect, it, vi } from "vitest";
import { createExtractionBatches } from "./extract-batch";
import type { ExtractNames } from "./extract";
import recorded from "./fixtures/extract-names-message.json";

const BATCH_ID = "msgbatch_01HandBuilt";
const RESULTS_URL = `https://api.anthropic.com/v1/messages/batches/${BATCH_ID}/results`;
const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const batch = (status: "in_progress" | "ended") => ({
  id: BATCH_ID,
  type: "message_batch",
  processing_status: status,
  results_url: status === "ended" ? RESULTS_URL : null,
  request_counts: { processing: 0, succeeded: 1, errored: 1, canceled: 0, expired: 1 },
  created_at: "2026-09-27T02:00:00Z",
  ended_at: status === "ended" ? "2026-09-27T02:20:00Z" : null,
  expires_at: "2026-09-28T02:00:00Z",
  archived_at: null,
  cancel_initiated_at: null,
});

const jsonl = (rows: unknown[]) =>
  new Response(rows.map((r) => JSON.stringify(r)).join("\n") + "\n", {
    headers: { "Content-Type": "application/binary" },
  });

function setup(route: (url: string) => Response, backup: ExtractNames | null = null) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => route(String(input)));
  const sleep = vi.fn(async () => {});
  return { fetch, batches: createExtractionBatches("sk-ant-test", { fetch, sleep, backup }) };
}

const CREDIT_ERROR = {
  type: "error",
  error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." },
};

/** The single-call path on OpenAI, faked: it names the business the answer starts with. */
function fakeBackup(fail: Set<string> = new Set()) {
  let running = 0;
  let peak = 0;
  const backup = vi.fn<ExtractNames>(async (answer) => {
    running++;
    peak = Math.max(peak, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running--;
    if (fail.has(answer)) throw new Error("openai server 500");
    return {
      promptVersion: "extract-names.v1",
      model: "gpt-4.1-mini-2025-04-14",
      names: [{ name: answer.split(" ")[0], position: 1 }],
      usage: { inputTokens: 900, cachedInputTokens: 0, outputTokens: 20, searchCalls: 0 },
      costUsd: 0.0004,
      provider: "openai",
      fellBack: true,
      primaryError: null,
    };
  });
  return { backup, peak: () => peak };
}

describe("createExtractionBatches", () => {
  it("submits one extraction request per cached answer, keyed by cache key", async () => {
    const { fetch, batches } = setup(() => json(batch("in_progress")));
    const id = await batches.submit([
      { customId: KEY_A, answer: "Answer A" },
      { customId: KEY_B, answer: "Answer B" },
    ]);

    expect(id).toEqual({ batchId: BATCH_ID, outcome: null });
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages/batches");
    const body = JSON.parse(String(init?.body));
    expect(body.requests).toHaveLength(2);
    expect(body.requests[0]).toMatchObject({
      custom_id: KEY_A,
      params: {
        model: "claude-haiku-4-5",
        messages: [{ role: "user", content: "<answer>\nAnswer A\n</answer>" }],
        output_config: { format: { type: "json_schema" } },
      },
    });
  });

  it("rejects bad or duplicate custom ids before calling the API", async () => {
    const { fetch, batches } = setup(() => json(batch("in_progress")));
    await expect(batches.submit([])).rejects.toThrow(/at least one/);
    await expect(batches.submit([{ customId: "has space", answer: "x" }])).rejects.toThrow(/Invalid/);
    await expect(
      batches.submit([
        { customId: KEY_A, answer: "x" },
        { customId: KEY_A, answer: "y" },
      ]),
    ).rejects.toThrow(/Duplicate/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns null while the batch is still running", async () => {
    const { batches } = setup(() => json(batch("in_progress")));
    expect(await batches.collect(BATCH_ID)).toBeNull();
  });

  it("collects results in any order, at half price, and lists failures by retryability", async () => {
    const { batches } = setup((url) =>
      url === RESULTS_URL
        ? jsonl([
            { custom_id: "c".repeat(64), result: { type: "expired" } },
            {
              custom_id: KEY_B,
              result: {
                type: "errored",
                error: { type: "error", error: { type: "invalid_request_error", message: "bad schema" } },
              },
            },
            { custom_id: KEY_A, result: { type: "succeeded", message: recorded } },
          ])
        : json(batch("ended")),
    );
    const outcome = await batches.collect(BATCH_ID);

    expect(outcome?.extractions.get(KEY_A)?.names.map((n) => n.name)).toEqual([
      "Contra Coffee & Tea",
      "Portola Coffee Roasters",
      "Kaffee Meister",
    ]);
    // Half of the live price in extract.test.ts ($0.0012).
    expect(outcome?.extractions.get(KEY_A)?.costUsd).toBe(0.0006);
    expect(outcome?.failed).toEqual([
      { customId: "c".repeat(64), reason: "batch request expired", retryable: true },
      { customId: KEY_B, reason: "bad schema", retryable: false },
    ]);
  });

  it("runs the answers on OpenAI, five at a time, when the batch cannot be created", async () => {
    const { backup, peak } = fakeBackup();
    const { batches } = setup(() => json(CREDIT_ERROR, 400), backup);
    const items = Array.from({ length: 12 }, (_, i) => ({ customId: String(i).padStart(64, "k"), answer: `Shop${i} is great` }));
    const result = await batches.submit(items);

    expect(result.batchId).toBeNull();
    expect(result.outcome?.failed).toEqual([]);
    expect(result.outcome?.extractions.size).toBe(12);
    expect(result.outcome?.extractions.get(items[3].customId)).toMatchObject({
      provider: "openai",
      fellBack: true,
      primaryError: expect.stringMatching(/^Message Batches: .*credit balance/),
      names: [{ name: "Shop3", position: 1 }],
    });
    expect(backup).toHaveBeenCalledTimes(12);
    expect(peak()).toBe(5);
  });

  it("still throws when the batch cannot be created and there is no backup", async () => {
    const { batches } = setup(() => json(CREDIT_ERROR, 400));
    await expect(batches.submit([{ customId: KEY_A, answer: "x" }])).rejects.toThrow(/credit balance/);
  });

  it("reruns expired and failed answers on OpenAI, but not our own invalid requests", async () => {
    const { backup } = fakeBackup(new Set(["Gamma never works"]));
    const KEY_C = "c".repeat(64);
    const KEY_D = "d".repeat(64);
    const { batches } = setup(
      (url) =>
        url === RESULTS_URL
          ? jsonl([
              { custom_id: KEY_C, result: { type: "expired" } },
              { custom_id: KEY_B, result: { type: "errored", error: { type: "error", error: { type: "invalid_request_error", message: "bad schema" } } } },
              { custom_id: KEY_D, result: { type: "errored", error: { type: "error", error: { type: "api_error", message: "overloaded" } } } },
              { custom_id: KEY_A, result: { type: "succeeded", message: recorded } },
            ])
          : json(batch("ended")),
      backup,
    );
    const answers = new Map([
      [KEY_A, "Answer A"],
      [KEY_B, "Beta answer"],
      [KEY_C, "Gamma never works"],
      [KEY_D, "Delta answer"],
    ]);
    const outcome = await batches.collect(BATCH_ID, answers);

    expect(outcome?.extractions.get(KEY_A)).toMatchObject({ provider: "anthropic" });
    expect(outcome?.extractions.get(KEY_D)).toMatchObject({ provider: "openai", fellBack: true, names: [{ name: "Delta" }] });
    expect(backup.mock.calls.map(([a]) => a).sort()).toEqual(["Delta answer", "Gamma never works"]);
    expect(outcome?.failed).toEqual([
      { customId: KEY_C, reason: "openai server 500", retryable: true },
      { customId: KEY_B, reason: "bad schema", retryable: false },
    ]);
  });
});
