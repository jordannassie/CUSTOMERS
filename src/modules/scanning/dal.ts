import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";

// Database access for scanning. ai_answer_cache and usage_events writes are service-role only.

export type AnswerCacheRow = {
  answer: string;
  citations: Json;
  extractedNames: Json | null;
  model: string;
  costUsd: number;
  createdAt: string;
};

/** The cached answer for this key if it was saved after `since`, else null. */
export async function findCachedAnswer(cacheKey: string, since: Date): Promise<AnswerCacheRow | null> {
  const { data, error } = await createServiceClient()
    .from("ai_answer_cache")
    .select("answer, citations, extracted_names, model, cost_usd, created_at")
    .eq("cache_key", cacheKey)
    .gt("created_at", since.toISOString())
    .maybeSingle();
  if (error) throw new Error(`Could not read the answer cache: ${error.message}`);
  if (!data) return null;
  return {
    answer: data.answer,
    citations: data.citations,
    extractedNames: data.extracted_names,
    model: data.model,
    costUsd: Number(data.cost_usd),
    createdAt: data.created_at,
  };
}

/** Saves a fresh answer, replacing an expired one; its extracted names are cleared until B-25 writes them. */
export async function upsertCachedAnswer(row: {
  cacheKey: string;
  model: string;
  question: string;
  location: string;
  answer: string;
  citations: Json;
  costUsd: number;
}): Promise<void> {
  const { error } = await createServiceClient().from("ai_answer_cache").upsert({
    cache_key: row.cacheKey,
    model: row.model,
    question: row.question,
    location: row.location,
    answer: row.answer,
    citations: row.citations,
    cost_usd: row.costUsd,
    extracted_names: null,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Could not write the answer cache: ${error.message}`);
}

export async function insertCheckUsage(row: {
  accountUserId: string;
  businessId: string | null;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number;
  cached: boolean;
}): Promise<void> {
  const { error } = await createServiceClient().from("usage_events").insert({
    account_user_id: row.accountUserId,
    business_id: row.businessId,
    usage_type: "ai_visibility_check",
    provider: row.provider,
    model: row.model,
    input_tokens: row.inputTokens,
    output_tokens: row.outputTokens,
    // A cache hit made no API call.
    request_count: row.cached ? 0 : 1,
    estimated_cost_usd: row.costUsd,
    cached: row.cached,
  });
  if (error) throw new Error(`Could not record check usage: ${error.message}`);
}

/** Stores the names extracted from a cached answer (B-25), so later cache hits reuse them. */
export async function saveExtractedNames(cacheKey: string, extractedNames: Json): Promise<void> {
  const { error } = await createServiceClient()
    .from("ai_answer_cache")
    .update({ extracted_names: extractedNames })
    .eq("cache_key", cacheKey);
  if (error) throw new Error(`Could not save extracted names: ${error.message}`);
}
