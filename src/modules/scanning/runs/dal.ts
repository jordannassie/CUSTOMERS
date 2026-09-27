import "server-only";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";
import { createNameExtractor, type ExtractNames } from "../extract";
import { createAnthropicCheck } from "../providers/anthropic";
import { createOpenAICheck } from "../providers/openai";
import { createPerplexityCheck } from "../providers/perplexity";
import type { ProviderId, RunCheck } from "../providers/types";

// Database access and API keys for scan runs (B-26); the cache and usage part is in ../dal.ts.
// Everything here uses the service role: the worker runs with no user session.

function must<T>(what: string, result: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(`Could not ${what}: ${result.error.message}`);
  if (result.data == null) throw new Error(`Could not ${what}: not found`);
  return result.data;
}

export type ScanJobRow = { id: string; agencyId: string; businessId: string; holdId: string | null };

export async function loadScanJob(jobId: string): Promise<ScanJobRow> {
  const result = await createServiceClient()
    .from("scan_jobs")
    .select("id, agency_id, business_id, hold_id")
    .eq("id", jobId)
    .single();
  const row = must("load the scan job", result);
  return { id: row.id, agencyId: row.agency_id, businessId: row.business_id, holdId: row.hold_id };
}

export type ScanTargetRow = {
  business: {
    id: string;
    ownerUserId: string;
    name: string;
    domain: string | null;
    aliases: string[];
    phone: string | null;
    hasWebsite: boolean | null;
    city: string | null;
    region: string | null;
    country: string | null;
    status: string;
    scanFrequency: string;
    models: string[];
  };
  isTest: boolean;
  questions: { id: string; prompt: string }[];
  competitors: { name: string; domain: string | null; phone: string | null; city: string | null }[];
};

export async function loadScanTarget(businessId: string, agencyId: string): Promise<ScanTargetRow> {
  const db = createServiceClient();
  const [business, agency, questions, competitors] = await Promise.all([
    db
      .from("businesses")
      .select(
        "id, owner_user_id, name, domain, aliases, phone, has_website, primary_city, primary_region, primary_country, status, scan_frequency, models",
      )
      .eq("id", businessId)
      .single(),
    db.from("agencies").select("is_test").eq("id", agencyId).single(),
    db.from("tracked_prompts").select("id, prompt").eq("business_id", businessId).eq("active", true).order("created_at"),
    db.from("business_competitors").select("name, domain, phone, city").eq("business_id", businessId),
  ]);
  const b = must("load the business", business);
  return {
    business: {
      id: b.id,
      ownerUserId: b.owner_user_id,
      name: b.name,
      domain: b.domain,
      aliases: b.aliases,
      phone: b.phone,
      hasWebsite: b.has_website,
      city: b.primary_city,
      region: b.primary_region,
      country: b.primary_country,
      status: b.status,
      scanFrequency: b.scan_frequency,
      models: b.models,
    },
    isTest: must("load the agency", agency).is_test,
    questions: must("load the questions", questions),
    competitors: must("load the competitors", competitors),
  };
}

/** The job's run, created on the first attempt; a retried job gets the same run back. */
export async function findOrCreateRun(params: {
  jobId: string;
  businessId: string;
  provider: string;
}): Promise<{ id: string; status: string }> {
  const db = createServiceClient();
  const existing = await db.from("visibility_runs").select("id, status").eq("scan_job_id", params.jobId).maybeSingle();
  if (existing.error) throw new Error(`Could not load the scan run: ${existing.error.message}`);
  if (existing.data) return existing.data;
  return must(
    "create the scan run",
    await db
      .from("visibility_runs")
      .insert({ scan_job_id: params.jobId, business_id: params.businessId, provider: params.provider, status: "running" })
      .select("id, status")
      .single(),
  );
}

/** Check ids already saved for this run, so a retried job does not ask them again. */
export async function listSavedCheckIds(runId: string): Promise<Set<string>> {
  const rows = must("load saved checks", await createServiceClient().from("visibility_results").select("id").eq("run_id", runId));
  return new Set(rows.map((r) => r.id));
}

export type CheckResultRow = {
  id: string;
  runId: string;
  businessId: string;
  trackedPromptId: string;
  provider: ProviderId;
  model: string;
  question: string;
  answerText: string;
  businessMentioned: boolean;
  mentionPosition: number | null;
  competitorsMentioned: Json;
  citations: Json;
  extractedNames: Json | null;
  cached: boolean;
  costUsd: number;
  latencyMs: number;
};

export async function saveCheckResult(row: CheckResultRow): Promise<void> {
  const { error } = await createServiceClient()
    .from("visibility_results")
    .upsert(
      {
        id: row.id,
        run_id: row.runId,
        business_id: row.businessId,
        tracked_prompt_id: row.trackedPromptId,
        provider: row.provider,
        model: row.model,
        question: row.question,
        answer_text: row.answerText,
        business_mentioned: row.businessMentioned,
        mention_position: row.mentionPosition,
        competitors_mentioned: row.competitorsMentioned,
        cited_sources: row.citations,
        extracted_names: row.extractedNames,
        cached: row.cached,
        cost_usd: row.costUsd,
        latency_ms: row.latencyMs,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw new Error(`Could not save the check result: ${error.message}`);
}

export async function finishRun(
  runId: string,
  outcome: { status: "completed" | "failed"; checksTotal: number; checksFailed: number; error: string | null },
): Promise<void> {
  const { error } = await createServiceClient()
    .from("visibility_runs")
    .update({
      status: outcome.status,
      checks_total: outcome.checksTotal,
      checks_failed: outcome.checksFailed,
      error: outcome.error,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
  if (error) throw new Error(`Could not finish the scan run: ${error.message}`);
}

export async function setNextScanAt(businessId: string, at: Date): Promise<void> {
  const { error } = await createServiceClient()
    .from("businesses")
    .update({ next_scan_at: at.toISOString() })
    .eq("id", businessId);
  if (error) throw new Error(`Could not set the next scan time: ${error.message}`);
}

/** Name extraction cost (B-25) is ours alone; the user is charged only for the check. */
export async function insertExtractionUsage(row: {
  accountUserId: string;
  businessId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}): Promise<void> {
  const { error } = await createServiceClient().from("usage_events").insert({
    account_user_id: row.accountUserId,
    business_id: row.businessId,
    usage_type: "other",
    provider: "anthropic",
    model: row.model,
    input_tokens: row.inputTokens,
    output_tokens: row.outputTokens,
    request_count: 1,
    estimated_cost_usd: row.costUsd,
  });
  if (error) throw new Error(`Could not record extraction usage: ${error.message}`);
}

const PROVIDER_KEYS: Record<ProviderId, () => string | undefined> = {
  openai: () => env.OPENAI_API_KEY,
  anthropic: () => env.ANTHROPIC_API_KEY,
  perplexity: () => env.PERPLEXITY_API_KEY,
};

const ADAPTERS: Record<ProviderId, (apiKey: string) => RunCheck> = {
  openai: createOpenAICheck,
  anthropic: createAnthropicCheck,
  perplexity: createPerplexityCheck,
};

/** The live adapter for a provider, or null when its API key is not set. */
export function liveCheckRunner(provider: ProviderId): RunCheck | null {
  const key = PROVIDER_KEYS[provider]();
  return key ? ADAPTERS[provider](key) : null;
}

export function liveNameExtractor(): ExtractNames | null {
  const key = env.ANTHROPIC_API_KEY;
  return key ? createNameExtractor(key) : null;
}
