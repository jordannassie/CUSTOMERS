import "server-only";
// Scheduled scans send name extraction through the Message Batches API at half price (MVP_SPEC 5.2, D-74).
// Manual checks use the live extractor in extract.ts. When the batch cannot be created, or answers come back
// errored, expired or canceled, those answers go through the single-call path on OpenAI instead (D-84), five at
// a time, and land in the same outcome keyed by customId, so the caller stores them the same way.
import Anthropic from "@anthropic-ai/sdk";
import { classify } from "./providers/anthropic";
import { TIMEOUT_MS, withRetries, type Attempt, type RequestDeps } from "./providers/request";
import { extractionRequest, toExtraction, type ExtractNames, type Extraction } from "./extract";

/** customId is the answer's cache key, so each result goes straight back onto its cached answer. */
export type ExtractionBatchItem = { customId: string; answer: string };

export type BatchFailure = { customId: string; reason: string; retryable: boolean };

export type BatchOutcome = { extractions: Map<string, Extraction>; failed: BatchFailure[] };

/** A batch id to collect later, or, when the batch could not be created and the backup ran, the finished outcome. */
export type SubmitResult = { batchId: string; outcome: null } | { batchId: null; outcome: BatchOutcome };

export type BatchDeps = RequestDeps & {
  /** The single-call extractor on OpenAI (D-84); null turns the backup off. */
  backup?: ExtractNames | null;
};

export const BACKUP_CONCURRENCY = 5;

const CREDIT = /credit balance/i;

const CUSTOM_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_REQUESTS = 100_000;

export function createExtractionBatches(apiKey: string, deps: BatchDeps = {}) {
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

  /** Runs answers on the backup, five at a time; each success replaces its failure. */
  async function onBackup(items: ExtractionBatchItem[], reason: string): Promise<BatchOutcome> {
    const extractions = new Map<string, Extraction>();
    const failed: BatchFailure[] = [];
    const backup = deps.backup;
    if (!backup) return { extractions, failed: items.map((i) => ({ customId: i.customId, reason, retryable: true })) };
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const item = items[next++];
        try {
          const extraction = await backup(item.answer);
          extractions.set(item.customId, { ...extraction, fellBack: true, primaryError: `Message Batches: ${reason}`.slice(0, 400) });
        } catch (err) {
          failed.push({ customId: item.customId, reason: err instanceof Error ? err.message : String(err), retryable: true });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(BACKUP_CONCURRENCY, items.length) }, worker));
    return { extractions, failed };
  }

  /**
   * Starts one batch and returns its id; the caller saves the id and collects it on a later run. When the batch
   * cannot be created (Claude down or out of credit), the answers run on the backup now and the outcome comes back.
   */
  async function submit(items: ExtractionBatchItem[]): Promise<SubmitResult> {
    if (items.length === 0) throw new Error("A batch needs at least one answer");
    if (items.length > MAX_REQUESTS) throw new Error(`A batch holds at most ${MAX_REQUESTS} answers`);
    const ids = new Set<string>();
    for (const { customId } of items) {
      if (!CUSTOM_ID.test(customId)) throw new Error(`Invalid batch custom_id: ${customId}`);
      if (ids.has(customId)) throw new Error(`Duplicate batch custom_id: ${customId}`);
      ids.add(customId);
    }
    try {
      const batch = await call(() =>
        client.messages.batches.create({
          requests: items.map((item) => ({ custom_id: item.customId, params: extractionRequest(item.answer) })),
        }),
      );
      return { batchId: batch.id, outcome: null };
    } catch (err) {
      if (!deps.backup) throw err;
      return { batchId: null, outcome: await onBackup(items, err instanceof Error ? err.message : String(err)) };
    }
  }

  /**
   * Null while the batch is still running; results arrive in any order and are keyed by customId. With the answer
   * texts (keyed by customId), answers that came back errored, expired or canceled run on the backup.
   */
  async function collect(batchId: string, answers?: Map<string, string>): Promise<BatchOutcome | null> {
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
    if (!deps.backup || !answers) return { extractions, failed };

    // Our own invalid request would fail on the backup too; an empty Anthropic account would not.
    const rerun = failed.filter((f) => answers.has(f.customId) && (f.retryable || CREDIT.test(f.reason)));
    if (rerun.length === 0) return { extractions, failed };
    const backup = await onBackup(
      rerun.map((f) => ({ customId: f.customId, answer: answers.get(f.customId)! })),
      rerun[0].reason,
    );
    for (const [customId, extraction] of backup.extractions) extractions.set(customId, extraction);
    const stillFailed = new Map(backup.failed.map((f) => [f.customId, f]));
    return {
      extractions,
      failed: failed.flatMap((f) => (backup.extractions.has(f.customId) ? [] : [stillFailed.get(f.customId) ?? f])),
    };
  }

  return { submit, collect };
}
