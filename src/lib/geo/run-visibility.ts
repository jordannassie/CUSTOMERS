import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listConfiguredProviders } from "@/lib/geo/providers";
import { calculateDirectScore } from "@/lib/geo/direct-score";
import type { VisibilityProviderId } from "@/types/geo";

interface RunOptions {
  /** Cap on how many active prompts to run in this call — keeps a single
   * serverless invocation inside typical function time limits. The
   * scheduled monitoring job calls this repeatedly across all prompts. */
  maxPrompts?: number;
  providerId?: VisibilityProviderId;
}

export interface RunVisibilityResult {
  runId: string;
  provider: VisibilityProviderId;
  promptsAttempted: number;
  promptsSucceeded: number;
  score: number | null;
  error?: string;
}

const DEFAULT_MAX_PROMPTS = 12;
const CONCURRENCY = 4;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Runs up to `maxPrompts` active tracked prompts for a business through a
 * configured AI visibility provider, persists every result, and recomputes
 * the Direct Score from the results of this run. Uses the caller's Supabase
 * client (RLS-scoped) so it can only ever touch that business's own data —
 * except when explicitly given the service client by the cron job, which
 * still filters by business_id everywhere.
 */
export async function runVisibilityForBusiness(
  supabase: SupabaseClient,
  business: { id: string; name: string; domain: string | null; primary_city: string | null; primary_region: string | null },
  options: RunOptions = {},
): Promise<RunVisibilityResult> {
  const configured = listConfiguredProviders();
  const provider = options.providerId
    ? configured.find((p) => p.id === options.providerId)
    : configured[0];

  if (!provider) {
    return {
      runId: "",
      provider: options.providerId ?? "openai",
      promptsAttempted: 0,
      promptsSucceeded: 0,
      score: null,
      error:
        "No AI visibility provider is configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or PERPLEXITY_API_KEY.",
    };
  }

  const [{ data: prompts }, { data: competitors }] = await Promise.all([
    supabase
      .from("tracked_prompts")
      .select("id, prompt")
      .eq("business_id", business.id)
      .eq("active", true)
      .limit(options.maxPrompts ?? DEFAULT_MAX_PROMPTS),
    supabase.from("business_competitors").select("name").eq("business_id", business.id),
  ]);

  const activePrompts = prompts ?? [];
  const competitorNames = (competitors ?? []).map((c: { name: string }) => c.name);

  const { data: run, error: runError } = await supabase
    .from("visibility_runs")
    .insert({ business_id: business.id, provider: provider.id, status: "running" })
    .select("id")
    .single();

  if (runError || !run) {
    return {
      runId: "",
      provider: provider.id,
      promptsAttempted: 0,
      promptsSucceeded: 0,
      score: null,
      error: "Could not create a visibility run.",
    };
  }

  if (activePrompts.length === 0) {
    await supabase
      .from("visibility_runs")
      .update({ status: "failed", error: "No active tracked prompts.", completed_at: new Date().toISOString() })
      .eq("id", run.id);
    return {
      runId: run.id,
      provider: provider.id,
      promptsAttempted: 0,
      promptsSucceeded: 0,
      score: null,
      error: "No active tracked prompts to run.",
    };
  }

  const outcomes = await mapWithConcurrency(activePrompts, CONCURRENCY, async (trackedPrompt) => {
    try {
      const result = await provider.run(trackedPrompt.prompt, {
        businessName: business.name,
        domain: business.domain,
        city: business.primary_city,
        region: business.primary_region,
        competitorNames,
      });
      return { trackedPrompt, result, error: null as string | null };
    } catch (error) {
      return {
        trackedPrompt,
        result: null,
        error: error instanceof Error ? error.message : "Unknown provider error",
      };
    }
  });

  const succeeded = outcomes.filter((o) => o.result !== null);

  if (succeeded.length > 0) {
    const rows = succeeded.map(({ trackedPrompt, result }) => ({
      run_id: run.id,
      business_id: business.id,
      tracked_prompt_id: trackedPrompt.id,
      provider: provider.id,
      raw_response: result!.raw as object,
      business_mentioned: result!.businessMentioned,
      mention_position: result!.mentionPosition,
      competitors_mentioned: result!.competitorsMentioned,
      cited_sources: result!.citedSources,
      sentiment: null,
      methodology: result!.methodology,
    }));
    await supabase.from("visibility_results").insert(rows);
  }

  const allFailed = succeeded.length === 0;
  await supabase
    .from("visibility_runs")
    .update({
      status: allFailed ? "failed" : "completed",
      error: allFailed ? outcomes[0]?.error ?? "All prompts failed." : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  let score: number | null = null;
  if (succeeded.length > 0) {
    const breakdown = calculateDirectScore(
      succeeded.map(({ result }) => ({
        business_mentioned: result!.businessMentioned,
        mention_position: result!.mentionPosition,
        cited_sources: result!.citedSources,
        competitors_mentioned: result!.competitorsMentioned,
      })),
      business.domain,
    );
    await supabase.from("visibility_scores").insert({
      business_id: business.id,
      score: breakdown.score,
      mention_rate: breakdown.mentionRate,
      citation_rate: breakdown.citationRate,
      prompts_won: breakdown.promptsWon,
      prompts_tested: breakdown.promptsTested,
      competitor_share: breakdown.competitorShare,
    });
    score = breakdown.score;
  }

  return {
    runId: run.id,
    provider: provider.id,
    promptsAttempted: activePrompts.length,
    promptsSucceeded: succeeded.length,
    score,
    error: allFailed ? outcomes[0]?.error ?? "All prompts failed." : undefined,
  };
}
