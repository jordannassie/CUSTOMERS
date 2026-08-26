import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDefaultSeoProvider, buildLocationName } from "./provider";
import { recordSeoUsage, isFresh, REFRESH_POLICY } from "./usage";
import { generateSeoOpportunities } from "./opportunity-engine";

interface BusinessInput {
  id: string;
  name: string;
  domain: string | null;
  primary_city: string | null;
  primary_region: string | null;
  primary_country: string | null;
}

interface CompetitorInput {
  id: string;
  name: string;
  domain: string | null;
}

interface RunOptions {
  force?: boolean;
  /** Cap on how many tracked competitors to run keyword-gap analysis
   * against in one call — DataForSEO is usage-based, so this is a
   * deliberate cost ceiling, not a UI limitation. */
  maxCompetitors?: number;
}

export interface RunSeoAnalysisResult {
  runId: string | null;
  status: "completed" | "failed" | "skipped";
  domainOverviewRefreshed: boolean;
  keywordsDiscovered: number;
  competitorGapsFound: number;
  backlinksRefreshed: boolean;
  opportunitiesCreated: number;
  errors: string[];
}

const DEFAULT_MAX_COMPETITORS = 3;

/**
 * Server-side SEO scan orchestrator — the SEO counterpart to
 * runVisibilityForBusiness (src/lib/geo/run-visibility.ts). Uses the
 * caller's RLS-scoped Supabase client, is cost-aware (skips any step whose
 * most recent snapshot is still fresh per REFRESH_POLICY unless `force` is
 * set), and never fabricates a number: any step the provider can't fulfill
 * is recorded as an error and simply omitted from what gets generated into
 * opportunities, rather than guessed.
 */
export async function runSeoAnalysisForBusiness(
  supabase: SupabaseClient,
  business: BusinessInput,
  competitors: CompetitorInput[],
  options: RunOptions = {},
): Promise<RunSeoAnalysisResult> {
  const provider = getDefaultSeoProvider();
  if (!provider) {
    return {
      runId: null,
      status: "skipped",
      domainOverviewRefreshed: false,
      keywordsDiscovered: 0,
      competitorGapsFound: 0,
      backlinksRefreshed: false,
      opportunitiesCreated: 0,
      errors: ["No SEO provider is configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD."],
    };
  }

  if (!business.domain) {
    return {
      runId: null,
      status: "skipped",
      domainOverviewRefreshed: false,
      keywordsDiscovered: 0,
      competitorGapsFound: 0,
      backlinksRefreshed: false,
      opportunitiesCreated: 0,
      errors: ["This business has no domain on file — SEO analysis needs a domain."],
    };
  }

  const domain = business.domain;
  const locationName = buildLocationName(business.primary_city, business.primary_region, business.primary_country);
  const errors: string[] = [];

  const { data: run, error: runError } = await supabase
    .from("seo_runs")
    .insert({ business_id: business.id, type: "full", status: "running", provider: "dataforseo" })
    .select("id")
    .single();

  if (runError || !run) {
    return {
      runId: null,
      status: "failed",
      domainOverviewRefreshed: false,
      keywordsDiscovered: 0,
      competitorGapsFound: 0,
      backlinksRefreshed: false,
      opportunitiesCreated: 0,
      errors: ["Could not create an SEO run."],
    };
  }
  const runId = run.id as string;

  async function usage(endpoint: string) {
    await recordSeoUsage(supabase, { business_id: business.id, run_id: runId, endpoint });
  }

  // --- 1. Domain overview (cost-gated: refresh at most every 7 days) -------
  let domainOverviewRefreshed = false;
  const { data: lastSnapshot } = await supabase
    .from("seo_domain_snapshots")
    .select("captured_at")
    .eq("business_id", business.id)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (options.force || !isFresh(lastSnapshot?.captured_at, REFRESH_POLICY.domainOverviewDays)) {
    const overview = await provider.getDomainOverview(domain, locationName);
    await usage("dataforseo_labs/google/domain_rank_overview");
    if (overview.ok) {
      await supabase.from("seo_domain_snapshots").insert({
        business_id: business.id,
        domain,
        organic_keywords: overview.data.organicKeywords,
        estimated_traffic: overview.data.estimatedTraffic,
        estimated_traffic_value: overview.data.estimatedTrafficValue,
        referring_domains: overview.data.referringDomains,
        backlinks: overview.data.backlinks,
        domain_rank: overview.data.domainRank,
        provider: "dataforseo",
        raw_data: overview.data.raw as object,
      });
      domainOverviewRefreshed = true;
    } else {
      errors.push(overview.error);
    }
  }

  // --- 2. Keyword discovery + own rankings (cost-gated) ---------------------
  let keywordsDiscovered = 0;
  let ownRankedKeywords: Array<{ keyword: string; position: number | null; searchVolume: number | null }> = [];

  const { data: lastKeyword } = await supabase
    .from("seo_keywords")
    .select("discovered_at")
    .eq("business_id", business.id)
    .order("discovered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (options.force || !isFresh(lastKeyword?.discovered_at, REFRESH_POLICY.keywordDiscoveryDays)) {
    const rankings = await provider.getDomainRankings(domain, locationName);
    await usage("dataforseo_labs/google/ranked_keywords");
    if (rankings.ok) {
      ownRankedKeywords = rankings.data.map((r) => ({ keyword: r.keyword, position: r.position, searchVolume: r.searchVolume }));

      // Fetch prior positions first so the upsert below can shift
      // current_position -> previous_position instead of overwriting it —
      // Supabase's upsert() can't reference a row's own pre-update value.
      const { data: priorRows } = await supabase
        .from("seo_keywords")
        .select("keyword, current_position")
        .eq("business_id", business.id);
      const priorPositionByKeyword = new Map((priorRows ?? []).map((row: { keyword: string; current_position: number | null }) => [row.keyword, row.current_position]));

      for (const r of rankings.data) {
        if (!r.keyword) continue;
        await supabase
          .from("seo_keywords")
          .upsert(
            {
              business_id: business.id,
              keyword: r.keyword,
              search_volume: r.searchVolume,
              difficulty: r.difficulty,
              current_position: r.position,
              previous_position: priorPositionByKeyword.get(r.keyword) ?? null,
              ranking_url: r.url,
              location: locationName ?? "",
              provider: "dataforseo",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "business_id,keyword,location" },
          );
      }
      keywordsDiscovered = rankings.data.length;
    } else {
      errors.push(rankings.error);
    }
  } else {
    const { data: existing } = await supabase
      .from("seo_keywords")
      .select("keyword, current_position, search_volume")
      .eq("business_id", business.id)
      .limit(200);
    ownRankedKeywords = (existing ?? []).map((k: { keyword: string; current_position: number | null; search_volume: number | null }) => ({
      keyword: k.keyword,
      position: k.current_position,
      searchVolume: k.search_volume,
    }));
  }

  // --- 3. Backlink overview (cost-gated) ------------------------------------
  let backlinksRefreshed = false;
  const { data: lastBacklinks } = await supabase
    .from("seo_referring_domains")
    .select("captured_at")
    .eq("business_id", business.id)
    .eq("target", "business")
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // True cross-domain backlink-gap analysis (domains linking to a competitor
  // but not this business) needs per-competitor backlink calls, which would
  // multiply DataForSEO cost per competitor per run — deferred past V1 (see
  // seo_referring_domains.target, which already has a 'competitor' value
  // reserved for when this is built). Always null for now, on purpose.
  const backlinkGapDomainCount: number | null = null;
  if (options.force || !isFresh(lastBacklinks?.captured_at, REFRESH_POLICY.backlinkOverviewDays)) {
    const backlinks = await provider.getBacklinkOverview(domain);
    await usage("backlinks/summary+referring_domains");
    if (backlinks.ok) {
      const rows = backlinks.data.topReferringDomains.map((d) => ({
        business_id: business.id,
        domain: d.domain,
        target: "business" as const,
        backlinks: d.backlinks,
        first_seen: d.firstSeen,
        domain_rank: d.domainRank,
        provider: "dataforseo",
      }));
      if (rows.length > 0) await supabase.from("seo_referring_domains").insert(rows);
      backlinksRefreshed = true;
    } else {
      errors.push(backlinks.error);
    }
  }

  // --- 4. Competitor keyword gaps (cost-gated, capped to a few competitors) -
  let competitorGapsFound = 0;
  const allGaps: Array<{
    competitorName: string;
    keyword: string;
    searchVolume: number | null;
    difficulty: number | null;
    competitorPosition: number | null;
    businessPosition: number | null;
    competitorUrl: string | null;
  }> = [];

  const withDomain = competitors.filter((c) => c.domain).slice(0, options.maxCompetitors ?? DEFAULT_MAX_COMPETITORS);
  const { data: lastGap } = await supabase
    .from("seo_competitor_keywords")
    .select("captured_at")
    .eq("business_id", business.id)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (withDomain.length > 0 && (options.force || !isFresh(lastGap?.captured_at, REFRESH_POLICY.competitorGapDays))) {
    for (const competitor of withDomain) {
      const gaps = await provider.compareCompetitorKeywords(domain, competitor.domain!, locationName);
      await usage("dataforseo_labs/google/domain_intersection");
      if (!gaps.ok) {
        errors.push(`${competitor.name}: ${gaps.error}`);
        continue;
      }
      const rows = gaps.data.map((g) => ({
        business_id: business.id,
        competitor_id: competitor.id,
        keyword: g.keyword,
        search_volume: g.searchVolume,
        difficulty: g.difficulty,
        competitor_position: g.competitorPosition,
        business_position: g.businessPosition,
        competitor_url: g.competitorUrl,
        opportunity_score: g.searchVolume && g.difficulty ? g.searchVolume / Math.max(g.difficulty, 1) : null,
      }));
      if (rows.length > 0) await supabase.from("seo_competitor_keywords").insert(rows);
      competitorGapsFound += rows.length;
      for (const g of gaps.data) {
        allGaps.push({ competitorName: competitor.name, ...g });
      }
    }
  } else if (withDomain.length > 0) {
    const competitorIds = withDomain.map((c) => c.id);
    const { data: existing } = await supabase
      .from("seo_competitor_keywords")
      .select("competitor_id, keyword, search_volume, difficulty, competitor_position, business_position, competitor_url")
      .eq("business_id", business.id)
      .in("competitor_id", competitorIds);
    const nameById = new Map(withDomain.map((c) => [c.id, c.name]));
    for (const row of existing ?? []) {
      allGaps.push({
        competitorName: nameById.get(row.competitor_id) ?? "Competitor",
        keyword: row.keyword,
        searchVolume: row.search_volume,
        difficulty: row.difficulty,
        competitorPosition: row.competitor_position,
        businessPosition: row.business_position,
        competitorUrl: row.competitor_url,
      });
    }
  }

  // --- 5. Generate + persist SEO opportunities from whatever we have -------
  const drafts = generateSeoOpportunities({
    businessName: business.name,
    domain,
    city: business.primary_city,
    competitorGaps: allGaps,
    ownRankedKeywords,
    backlinkGapDomainCount,
  });

  let opportunitiesCreated = 0;
  if (drafts.length > 0) {
    const rows = drafts.map((d) => ({
      business_id: business.id,
      title: d.title,
      description: d.description,
      evidence: d.evidence,
      impact: d.impact,
      category: d.category,
      status: "open" as const,
      recommended_action: d.recommended_action,
      claude_prompt: d.claude_prompt,
      source: "seo" as const,
    }));
    const { error: insertError } = await supabase.from("opportunities").insert(rows);
    if (!insertError) opportunitiesCreated = rows.length;
    else errors.push("Could not save SEO opportunities.");
  }

  const anySucceeded = domainOverviewRefreshed || keywordsDiscovered > 0 || backlinksRefreshed || competitorGapsFound > 0 || opportunitiesCreated > 0;
  const status: RunSeoAnalysisResult["status"] = errors.length > 0 && !anySucceeded ? "failed" : "completed";

  await supabase
    .from("seo_runs")
    .update({
      status,
      error: errors.length > 0 ? errors.join(" | ").slice(0, 2000) : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  return {
    runId,
    status,
    domainOverviewRefreshed,
    keywordsDiscovered,
    competitorGapsFound,
    backlinksRefreshed,
    opportunitiesCreated,
    errors,
  };
}
