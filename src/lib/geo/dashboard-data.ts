import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Business,
  BusinessCompetitor,
  Opportunity,
  TrackedPrompt,
  VisibilityScore,
} from "@/types/geo";

/**
 * Returns the current user's most recently created business, or null if
 * they haven't onboarded one yet. V1 supports one business per account —
 * multi-business support can reuse this same query with a business_id param.
 */
export async function getPrimaryBusiness(): Promise<Business | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Business) ?? null;
}

export async function getLatestScore(businessId: string): Promise<VisibilityScore | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visibility_scores")
    .select("*")
    .eq("business_id", businessId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as VisibilityScore) ?? null;
}

export async function getScoreHistory(businessId: string, limit = 12): Promise<VisibilityScore[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visibility_scores")
    .select("*")
    .eq("business_id", businessId)
    .order("calculated_at", { ascending: false })
    .limit(limit);
  return ((data as VisibilityScore[]) ?? []).reverse();
}

export async function getTrackedPrompts(businessId: string): Promise<TrackedPrompt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracked_prompts")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  return (data as TrackedPrompt[]) ?? [];
}

export async function getCompetitors(businessId: string): Promise<BusinessCompetitor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_competitors")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  return (data as BusinessCompetitor[]) ?? [];
}

export async function getOpportunities(businessId: string): Promise<Opportunity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return (data as Opportunity[]) ?? [];
}

export interface LatestRunSummary {
  id: string;
  provider: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export async function getLatestRun(businessId: string): Promise<LatestRunSummary | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visibility_runs")
    .select("id, provider, status, started_at, completed_at, error")
    .eq("business_id", businessId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export interface VisibilityResultWithPrompt {
  id: string;
  provider: string;
  business_mentioned: boolean;
  mention_position: number | null;
  competitors_mentioned: Array<{ name: string }>;
  cited_sources: Array<{ url: string }>;
  methodology: string | null;
  created_at: string;
  tracked_prompt_id: string | null;
  prompt: string | null;
}

export async function getLatestRunResults(businessId: string): Promise<VisibilityResultWithPrompt[]> {
  const supabase = await createClient();
  const latestRun = await getLatestRun(businessId);
  if (!latestRun || latestRun.status !== "completed") return [];

  const { data } = await supabase
    .from("visibility_results")
    .select("id, provider, business_mentioned, mention_position, competitors_mentioned, cited_sources, methodology, created_at, tracked_prompt_id, tracked_prompts(prompt)")
    .eq("run_id", latestRun.id)
    .order("created_at", { ascending: true });

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    provider: row.provider as string,
    business_mentioned: row.business_mentioned as boolean,
    mention_position: row.mention_position as number | null,
    competitors_mentioned: (row.competitors_mentioned as Array<{ name: string }>) ?? [],
    cited_sources: (row.cited_sources as Array<{ url: string }>) ?? [],
    methodology: row.methodology as string | null,
    created_at: row.created_at as string,
    tracked_prompt_id: row.tracked_prompt_id as string | null,
    prompt: (row.tracked_prompts as { prompt: string } | null)?.prompt ?? null,
  }));
}
