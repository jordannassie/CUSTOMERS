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
 * Returns the business the dashboard should currently show for the signed-in
 * user: their `profiles.active_business_id` if set and still owned by them,
 * otherwise their most recently created business (original V1 behavior, and
 * the fallback for every user who has never switched/added a second
 * business — so this is a no-op change for the common single-business case).
 */
export async function getPrimaryBusiness(): Promise<Business | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_business_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.active_business_id) {
    const { data: active } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", profile.active_business_id)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (active) return active as Business;
    // active_business_id points at a business that's gone or no longer
    // theirs (e.g. deleted) — fall through to the most-recent fallback below.
  }

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Business) ?? null;
}

/**
 * Every business the signed-in user owns, most recently created first — the
 * source list for the sidebar business switcher and the "+ Add Business"
 * flow's completeness check.
 */
export async function listBusinesses(): Promise<Business[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  return (data as Business[]) ?? [];
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
