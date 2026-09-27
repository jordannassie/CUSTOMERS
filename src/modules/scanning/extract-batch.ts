import "server-only";
// Scheduled scans send name extraction through the Message Batches API at half price (MVP_SPEC 5.2, D-74).
// Manual checks use the live extractor in extract.ts.
import Anthropic from "@anthropic-ai/sdk";
import { classify } from "./providers/anthropic";
import { TIMEOUT_MS, withRetries, type Attempt, type RequestDeps } from "./providers/request";
import { extractionRequest, toExtraction, type Extraction } from "./extract";

/** customId is the answer's cache key, so each result goes straight back onto its cached answer. */
export type ExtractionBatchItem = { customId: string; answer: string };

export type BatchFailure = { customId: string; reason: string; retryable: boolean };

export type BatchOutcome = { extractions: Map<string, Extraction>; failed: BatchFailure[] };

const CUSTOM_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_REQUESTS = 100_000;

export function createExtractionBatches(apiKey: string, deps: RequestDeps = {}) {
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;
  const client = new Anthropic({ apiKey, fetch: deps.fetch, maxRetries: 0, timeout: timeoutMs });

  const call = <T>(run: () => Promise<T>) =>
    withRetries(async (attempt): Promise<Attempt<T>> => {
      try {
        return { ok: true, value: await run() };
      } catch (err) {
        return classify(err, attempt, timeoutMs);
      }
    }, deps);

  /** Starts one batch and returns its id; the caller saves the id and collects it on a later run. */
  async function submit(items: ExtractionBatchItem[]): Promise<string> {
    if (items.length === 0) throw new Error("A batch needs at least one answer");
    if (items.length > MAX_REQUESTS) throw new Error(`A batch holds at most ${MAX_REQUESTS} answers`);
    const ids = new Set<string>();
    for (const { customId } of items) {
      if (!CUSTOM_ID.test(customId)) throw new Error(`Invalid batch custom_id: ${customId}`);
      if (ids.has(customId)) throw new Error(`Duplicate batch custom_id: ${customId}`);
      ids.add(customId);
    }
    const batch = await call(() =>
      client.messages.batches.create({
        requests: items.map((item) => ({ custom_id: item.customId, params: extractionRequest(item.answer) })),
      }),
    );
    return batch.id;
  }

  /** Null while the batch is still running; results arrive in any order and are keyed by customId. */
  async function collect(batchId: string): Promise<BatchOutcome | null> {
    const batch = await call(() => client.messages.batches.retrieve(batchId));
    if (batch.processing_status !== "ended") return null;

    const extractions = new Map<string, Extraction>();
    const failed: BatchFailure[] = [];
    const results = await call(() => client.messages.batches.results(batchId));
    for await (const entry of results) {
      const { custom_id: customId, result } = entry;
      if (result.type === "succeeded") {
        try {
          extractions.set(customId, toExtraction(result.message, { batch: true }));
        } catch (err) {
          failed.push({ customId, reason: err instanceof Error ? err.message : String(err), retryable: false });
        }
      } else if (result.type === "errored") {
        const reason = result.error.error.message;
        // An invalid request fails again as sent; server errors can be retried in a later batch.
        failed.push({ customId, reason, retryable: result.error.error.type !== "invalid_request_error" });
      } else {
        failed.push({ customId, reason: `batch request ${result.type}`, retryable: true });
      }
    }
    return { extractions, failed };
  }

  return { submit, collect };
}
