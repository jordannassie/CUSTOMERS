import { describe, expect, it, vi } from "vitest";
import { createExtractionBatches } from "./extract-batch";
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

function setup(route: (url: string) => Response) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (input) => route(String(input)));
  const sleep = vi.fn(async () => {});
  return { fetch, batches: createExtractionBatches("sk-ant-test", { fetch, sleep }) };
}

describe("createExtractionBatches", () => {
  it("submits one extraction request per cached answer, keyed by cache key", async () => {
    const { fetch, batches } = setup(() => json(batch("in_progress")));
    const id = await batches.submit([
      { customId: KEY_A, answer: "Answer A" },
      { customId: KEY_B, answer: "Answer B" },
    ]);

    expect(id).toBe(BATCH_ID);
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
});
