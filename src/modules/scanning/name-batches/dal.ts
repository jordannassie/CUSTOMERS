import "server-only";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { liveAiClients } from "@/modules/ai/server";
import { createExtractionBatches } from "../extract-batch";
import { createNameExtractor } from "../extract";
import { mentionTargets } from "../recount/service";
import { insertExtractionUsage } from "../runs/dal";
import { collectNames, submitNames, type NameBatchClient, type NameBatchStore, type PendingRow } from "./service";

// The database and Anthropic sides of name batches (F-39, migration 097). Service role only: the worker runs with
// no user session. Everything is off unless NAME_EXTRACTION_BATCH is "true" and an Anthropic key is set.

export function nameBatchesEnabled(): boolean {
  return env.NAME_EXTRACTION_BATCH === "true" && Boolean(env.ANTHROPIC_API_KEY);
}

/** Anthropic's Message Batches, with the single-call OpenAI extractor as the backup (D-84); null when switched off. */
export function liveNameBatchClient(): NameBatchClient | null {
  if (!nameBatchesEnabled()) return null;
  const ai = liveAiClients();
  const backup = ai.openai ? createNameExtractor({ ...ai, anthropic: null }) : null;
  const batches = createExtractionBatches(env.ANTHROPIC_API_KEY!, { backup });
  return { submit: batches.submit, collect: batches.collect };
}

export const liveNameBatchStore: NameBatchStore = {
  async insert(batch) {
    const { error } = await createServiceClient()
      .from("name_extraction_batches")
      .insert({
        batch_id: batch.batchId,
        run_id: batch.runId,
        result_ids: batch.resultIds,
        status: batch.status,
        error: batch.error ?? null,
        ...(batch.status === "submitted" ? {} : { collected_at: new Date().toISOString() }),
      });
    if (error) throw new Error(`Name batches: could not save the batch: ${error.message}`);
  },
  async open(limit) {
    const { data, error } = await createServiceClient()
      .from("name_extraction_batches")
      .select("id, batch_id, run_id, result_ids, submitted_at")
      .eq("status", "submitted")
      .not("batch_id", "is", null)
      .order("submitted_at")
      .limit(limit);
    if (error) throw new Error(`Name batches: could not read open batches: ${error.message}`);
    return data.map((b) => ({ id: b.id, batchId: b.batch_id!, runId: b.run_id, resultIds: b.result_ids, submittedAt: b.submitted_at }));
  },
  async rows(resultIds) {
    if (resultIds.length === 0) return [];
    const { data, error } = await createServiceClient()
      .from("visibility_results")
      .select("id, business_id, answer_text, extracted_names, business_mentioned, mention_position, competitors_mentioned")
      .in("id", resultIds);
    if (error) throw new Error(`Name batches: could not read the answers: ${error.message}`);
    return data as PendingRow[];
  },
  async business(businessId) {
    const db = createServiceClient();
    const [business, competitors] = await Promise.all([
      db.from("businesses").select("owner_user_id, name, aliases, domain, primary_city, primary_area, phone, has_website").eq("id", businessId).single(),
      db.from("business_competitors").select("name, aliases, domain, phone, city").eq("business_id", businessId),
    ]);
    if (business.error) throw new Error(`Name batches: could not load the business: ${business.error.message}`);
    if (competitors.error) throw new Error(`Name batches: could not load competitors: ${competitors.error.message}`);
    const b = business.data;
    const targets = mentionTargets(
      { name: b.name, aliases: b.aliases, domain: b.domain, city: b.primary_city, phone: b.phone, hasWebsite: b.has_website, area: b.primary_area },
      competitors.data,
    );
    return { targets, ownerUserId: b.owner_user_id };
  },
  async saveNames(update) {
    const { data, error } = await createServiceClient()
      .from("visibility_results")
      .update(update.fields)
      .eq("id", update.id)
      .is("extracted_names", null)
      .select("id");
    if (error) throw new Error(`Name batches: could not save names: ${error.message}`);
    return data.length > 0;
  },
  async recordUsage({ businessId, ownerUserId, runId, extraction }) {
    await insertExtractionUsage({
      accountUserId: ownerUserId,
      businessId,
      model: extraction.model,
      inputTokens: extraction.usage.inputTokens,
      outputTokens: extraction.usage.outputTokens,
      costUsd: extraction.costUsd,
      provider: extraction.provider,
      fellBack: extraction.fellBack,
      primaryError: extraction.primaryError,
      runId,
    });
  },
  async touch(id) {
    const db = createServiceClient();
    const { data } = await db.from("name_extraction_batches").select("attempts").eq("id", id).single();
    await db.from("name_extraction_batches").update({ attempts: (data?.attempts ?? 0) + 1 }).eq("id", id).eq("status", "submitted");
  },
  async close(id, status, error) {
    const { data, error: updateError } = await createServiceClient()
      .from("name_extraction_batches")
      .update({ status, error, collected_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "submitted")
      .select("id");
    if (updateError) throw new Error(`Name batches: could not end the batch: ${updateError.message}`);
    return data.length > 0;
  },
};

/** Queues one scheduled scan's answers (worker side). */
export async function submitLiveNames(runId: string, client: NameBatchClient, items: { checkId: string; answer: string }[]): Promise<void> {
  await submitNames(runId, items, client, liveNameBatchStore);
}

/** Collects finished batches at the start of a worker run; does nothing at all while switched off. */
export async function collectLiveNameBatches(now: Date): Promise<number> {
  const client = liveNameBatchClient();
  if (!client) return 0;
  return collectNames(now, client, liveNameBatchStore);
}
