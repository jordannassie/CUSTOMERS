// Business names for scheduled scans through Anthropic's Message Batches API, at half price (F-39, MVP_SPEC 5.2, D-74).
// Same prompt and pinned model as the live extractor (extract.ts); only the delivery changes. A scheduled scan saves
// its answers at once with text-only mentions (the same result as a live extraction that failed), queues their names
// here, and a later worker run collects the batch, saves the names and checks the mentions again with the scan's own
// rules (recountCheck). Errored or expired answers go to the OpenAI backup (D-84, extract-batch.ts). Name extraction
// is never charged in credits, only recorded as AI cost. The database and the API come in as deps, so this is tested.
import type { Json } from "@/types/database.types";
import type { BatchOutcome, ExtractionBatchItem, SubmitResult } from "../extract-batch";
import { toStoredExtraction, type Extraction } from "../extract";
import { recountCheck, type mentionTargets, type SavedCheck } from "../recount/service";

/** Anthropic ends a batch within 24 hours; after this a batch still open is given up and keeps text-only mentions. */
export const BATCH_GIVE_UP_MS = 26 * 60 * 60 * 1000;
/** Open batches one worker run collects at most. */
export const COLLECT_LIMIT = 5;

/** Scheduled scans only (queued with priority 0 by enqueue_due_scans): Run scan never waits for names. */
export function batchesNames(opts: { enabled: boolean; priority: number; isTest: boolean }): boolean {
  return opts.enabled && opts.priority === 0 && !opts.isTest;
}

export type PendingRow = SavedCheck & { business_id: string };
export type Targets = ReturnType<typeof mentionTargets>;
export type NameUpdate = {
  id: string;
  businessId: string;
  fields: { business_mentioned: boolean; mention_position: number | null; competitors_mentioned: Json; extracted_names: Json | null };
  extraction: Extraction;
};
export type OpenBatch = { id: string; batchId: string; runId: string; resultIds: string[]; submittedAt: string };

export type NameBatchStore = {
  insert: (batch: { batchId: string | null; runId: string; resultIds: string[]; status: "submitted" | "collected" | "failed"; error?: string | null }) => Promise<void>;
  open: (limit: number) => Promise<OpenBatch[]>;
  rows: (resultIds: string[]) => Promise<PendingRow[]>;
  business: (businessId: string) => Promise<{ targets: Targets; ownerUserId: string }>;
  /** Saves names onto a check that still has none; false when another run already did (never applied twice). */
  saveNames: (update: NameUpdate) => Promise<boolean>;
  recordUsage: (usage: { businessId: string; ownerUserId: string; runId: string; extraction: Extraction }) => Promise<void>;
  touch: (id: string) => Promise<void>;
  /** Ends a batch that is still submitted; false when another run ended it first. */
  close: (id: string, status: "collected" | "failed", error: string | null) => Promise<boolean>;
};

export type NameBatchClient = {
  submit: (items: ExtractionBatchItem[]) => Promise<SubmitResult>;
  collect: (batchId: string, answers: Map<string, string>) => Promise<BatchOutcome | null>;
};

/** The saved check with its names and mentions as a scan would have saved them; null when it has names already or none came back. */
export function updateFor(row: PendingRow, outcome: BatchOutcome, targets: Targets): NameUpdate | null {
  if (row.extracted_names != null || !row.answer_text) return null;
  const extraction = outcome.extractions.get(row.id);
  if (!extraction) return null;
  const next = recountCheck({ ...row, extracted_names: toStoredExtraction(extraction) }, targets);
  const fields = next
    ? { business_mentioned: next.business_mentioned, mention_position: next.mention_position, competitors_mentioned: next.competitors_mentioned, extracted_names: next.extracted_names }
    : { business_mentioned: row.business_mentioned, mention_position: row.mention_position, competitors_mentioned: (row.competitors_mentioned ?? []) as Json, extracted_names: toStoredExtraction(extraction) as Json };
  return { id: row.id, businessId: row.business_id, fields, extraction };
}

/** Applies an outcome to the run's checks; returns how many got names now. */
export async function applyOutcome(runId: string, resultIds: string[], outcome: BatchOutcome, store: NameBatchStore): Promise<number> {
  const rows = await store.rows(resultIds);
  const businesses = new Map<string, Promise<{ targets: Targets; ownerUserId: string }>>();
  let applied = 0;
  for (const row of rows) {
    if (!businesses.has(row.business_id)) businesses.set(row.business_id, store.business(row.business_id));
    const business = await businesses.get(row.business_id)!;
    const update = updateFor(row, outcome, business.targets);
    if (!update || !(await store.saveNames(update))) continue;
    applied++;
    await store
      .recordUsage({ businessId: row.business_id, ownerUserId: business.ownerUserId, runId, extraction: update.extraction })
      .catch((err) => console.error(`name batches: could not record the cost for check ${row.id}: ${errorText(err)}`));
  }
  return applied;
}

/** Queues a scan's answers in one batch; when the batch could not be created, the backup already ran and its names are saved now. */
export async function submitNames(runId: string, items: { checkId: string; answer: string }[], client: NameBatchClient, store: NameBatchStore): Promise<void> {
  if (items.length === 0) return;
  const resultIds = items.map((i) => i.checkId);
  const submitted = await client.submit(items.map((i) => ({ customId: i.checkId, answer: i.answer })));
  if (submitted.batchId !== null) {
    await store.insert({ batchId: submitted.batchId, runId, resultIds, status: "submitted" });
    return;
  }
  await applyOutcome(runId, resultIds, submitted.outcome, store);
  await store.insert({ batchId: null, runId, resultIds, status: "collected", error: failedSummary(submitted.outcome) });
}

/** Collects finished batches (a few per worker run); returns how many were ended. Safe to run twice at once. */
export async function collectNames(now: Date, client: NameBatchClient, store: NameBatchStore): Promise<number> {
  let ended = 0;
  for (const batch of await store.open(COLLECT_LIMIT)) {
    const tooOld = now.getTime() - Date.parse(batch.submittedAt) > BATCH_GIVE_UP_MS;
    try {
      const rows = await store.rows(batch.resultIds);
      const answers = new Map(rows.filter((r) => r.extracted_names == null && r.answer_text).map((r) => [r.id, r.answer_text!]));
      if (answers.size === 0) {
        if (await store.close(batch.id, "collected", null)) ended++;
        continue;
      }
      const outcome = await client.collect(batch.batchId, answers);
      if (!outcome) {
        if (tooOld && (await store.close(batch.id, "failed", "Batch still running after 26 hours"))) ended++;
        else if (!tooOld) await store.touch(batch.id);
        continue;
      }
      await applyOutcome(batch.runId, batch.resultIds, outcome, store);
      if (await store.close(batch.id, "collected", failedSummary(outcome))) ended++;
    } catch (err) {
      console.error(`name batches: could not collect ${batch.batchId}: ${errorText(err)}`);
      if (tooOld && (await store.close(batch.id, "failed", errorText(err).slice(0, 500)).catch(() => false))) ended++;
      else await store.touch(batch.id).catch(() => undefined);
    }
  }
  return ended;
}

function failedSummary(outcome: BatchOutcome): string | null {
  if (outcome.failed.length === 0) return null;
  return `${outcome.failed.length} answer(s) kept text-only names: ${outcome.failed[0].reason}`.slice(0, 500);
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
