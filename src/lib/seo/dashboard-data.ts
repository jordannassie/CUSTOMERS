import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  SeoCompetitorKeyword,
  SeoDomainSnapshot,
  SeoKeyword,
  SeoReferringDomain,
  SeoRun,
} from "@/types/seo";

export async function getLatestSeoSnapshot(businessId: string): Promise<SeoDomainSnapshot | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_domain_snapshots")
    .select("*")
    .eq("business_id", businessId)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SeoDomainSnapshot) ?? null;
}

export async function getLatestSeoRun(businessId: string): Promise<SeoRun | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_runs")
    .select("*")
    .eq("business_id", businessId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SeoRun) ?? null;
}

export async function getSeoKeywords(businessId: string, limit = 100): Promise<SeoKeyword[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_keywords")
    .select("*")
    .eq("business_id", businessId)
    .order("search_volume", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data as SeoKeyword[]) ?? [];
}

export interface CompetitorSeoSummary {
  competitorId: string;
  competitorName: string;
  gapCount: number;
  topGapKeyword: string | null;
}

export async function getCompetitorSeoGaps(businessId: string): Promise<SeoCompetitorKeyword[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_competitor_keywords")
    .select("*")
    .eq("business_id", businessId)
    .order("opportunity_score", { ascending: false, nullsFirst: false })
    .limit(300);
  return (data as SeoCompetitorKeyword[]) ?? [];
}

export async function getReferringDomains(businessId: string, limit = 50): Promise<SeoReferringDomain[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_referring_domains")
    .select("*")
    .eq("business_id", businessId)
    .eq("target", "business")
    .order("backlinks", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data as SeoReferringDomain[]) ?? [];
}
