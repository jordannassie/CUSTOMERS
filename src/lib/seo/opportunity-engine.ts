// Deterministic, evidence-grounded SEO opportunity generator — the SEO
// counterpart to src/lib/geo/opportunity-engine.ts. Every opportunity it
// produces cites a real stored number (search volume, position, gap count)
// and never invents a reason a competitor is winning. Output shape matches
// geo/opportunity-engine.ts's OpportunityDraft (source is added by the
// caller when inserting, since that's a DB-layer concern, not a content one).

export type SeoOpportunityCategory =
  | "seo_keyword_gap"
  | "seo_competitor_gap"
  | "seo_backlink_gap"
  | "seo_ranking_opportunity";

export interface SeoOpportunityDraft {
  title: string;
  description: string;
  evidence: string;
  impact: "high" | "medium" | "low";
  category: SeoOpportunityCategory;
  recommended_action: string;
  claude_prompt: string;
}

interface CompetitorGapInput {
  competitorName: string;
  keyword: string;
  searchVolume: number | null;
  difficulty: number | null;
  competitorPosition: number | null;
  businessPosition: number | null;
  competitorUrl: string | null;
}

interface RankedKeywordInput {
  keyword: string;
  position: number | null;
  searchVolume: number | null;
}

interface SeoOpportunityInput {
  businessName: string;
  domain: string | null;
  city: string | null;
  competitorGaps: CompetitorGapInput[];
  ownRankedKeywords: RankedKeywordInput[];
  backlinkGapDomainCount: number | null;
}

function claudePromptFor(businessName: string, domain: string | null, evidence: string, ask: string): string {
  return [
    `I'm working on SEO / search visibility for ${businessName}${domain ? ` (${domain})` : ""}.`,
    "",
    "Context / evidence (from Customers.Direct's real SEO data — do not assume any facts beyond what's stated here):",
    evidence,
    "",
    ask,
    "",
    "Important: only use real information about this business that I provide or that you find by reading the actual website — never invent addresses, phone numbers, services, credentials, awards, or testimonials that weren't given to you.",
  ].join("\n");
}

export function generateSeoOpportunities(input: SeoOpportunityInput): SeoOpportunityDraft[] {
  const { businessName, domain, city, competitorGaps, ownRankedKeywords, backlinkGapDomainCount } = input;
  const opportunities: SeoOpportunityDraft[] = [];

  // A) Keyword gaps — competitor ranks, business doesn't rank at all.
  const trueGaps = competitorGaps
    .filter((g) => g.competitorPosition !== null && g.searchVolume)
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, 3);

  for (const gap of trueGaps) {
    const volume = gap.searchVolume ?? 0;
    const impact: SeoOpportunityDraft["impact"] = volume >= 1000 ? "high" : volume >= 200 ? "medium" : "low";
    const evidence =
      `"${gap.keyword}" gets an estimated ${volume.toLocaleString()} searches/month. ` +
      `${gap.competitorName} ranks #${gap.competitorPosition}${gap.competitorUrl ? ` (${gap.competitorUrl})` : ""}. ` +
      `${businessName} does not appear in the tracked organic results for this keyword.`;
    opportunities.push({
      title: `Create a page targeting "${gap.keyword}"${city ? ` ${city}` : ""}`,
      description: `A tracked competitor ranks for a buyer-relevant keyword this business doesn't rank for at all.`,
      evidence,
      impact,
      category: "seo_keyword_gap",
      recommended_action: `Create or expand a dedicated service/location page targeting "${gap.keyword}".`,
      claude_prompt: claudePromptFor(
        businessName,
        domain,
        evidence,
        `Draft an outline for a service/location page targeting "${gap.keyword}" — headings, the specific questions it should answer, and where to naturally include the keyword. Leave placeholders for any facts I need to fill in (pricing, service area, credentials).`,
      ),
    });
  }

  // B) Competitor page-gap summary — one competitor rankings substantially outnumber ours for tracked keywords.
  const byCompetitor = new Map<string, number>();
  for (const g of competitorGaps) {
    if (g.competitorPosition !== null && g.businessPosition === null) {
      byCompetitor.set(g.competitorName, (byCompetitor.get(g.competitorName) ?? 0) + 1);
    }
  }
  const biggestCompetitorGap = Array.from(byCompetitor.entries()).sort((a, b) => b[1] - a[1])[0];
  if (biggestCompetitorGap && biggestCompetitorGap[1] >= 5) {
    const [competitorName, count] = biggestCompetitorGap;
    const evidence = `${competitorName} ranks for ${count} tracked buyer-intent keywords that ${businessName} does not rank for at all.`;
    opportunities.push({
      title: `${competitorName} outranks you across ${count} keywords`,
      description: "A tracked competitor has a substantially broader organic footprint than this business.",
      evidence,
      impact: count >= 15 ? "high" : "medium",
      category: "seo_competitor_gap",
      recommended_action: `Review which of ${competitorName}'s pages target these keywords and identify which ones are worth building equivalents for.`,
      claude_prompt: claudePromptFor(
        businessName,
        domain,
        evidence,
        `Suggest a prioritized content plan (3-5 page ideas) ${businessName} could build to start closing this gap, based only on general SEO best practices — I have not given you the specific keyword list yet, so keep suggestions general and clearly marked as needing my confirmation.`,
      ),
    });
  }

  // C) Ranking opportunity — an existing page on page 2 (positions 11-20) with real search volume;
  // improving it is usually cheaper than creating new content from scratch.
  const page2 = ownRankedKeywords
    .filter((k) => k.position !== null && k.position >= 11 && k.position <= 20 && (k.searchVolume ?? 0) > 0)
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))[0];
  if (page2) {
    const evidence = `"${page2.keyword}" currently ranks #${page2.position} with an estimated ${(page2.searchVolume ?? 0).toLocaleString()} searches/month.`;
    opportunities.push({
      title: `Improve your existing "${page2.keyword}" page`,
      description: "This page already ranks on page 2 — improving it is likely easier than creating something new.",
      evidence,
      impact: (page2.searchVolume ?? 0) >= 500 ? "high" : "medium",
      category: "seo_ranking_opportunity",
      recommended_action: "Strengthen the existing page's content depth, internal links, and on-page structure rather than starting a new page.",
      claude_prompt: claudePromptFor(
        businessName,
        domain,
        evidence,
        `Suggest specific on-page improvements (content additions, internal linking, structured data) for an existing page currently ranking #${page2.position} for "${page2.keyword}", to help it move toward page 1. Base this only on general on-page SEO best practices.`,
      ),
    });
  }

  // D) Backlink gap — domains that link to at least one tracked competitor but not to this business.
  if (backlinkGapDomainCount && backlinkGapDomainCount > 0) {
    const evidence = `${backlinkGapDomainCount} domain${backlinkGapDomainCount === 1 ? "" : "s"} link to your tracked competitors but not to ${businessName}.`;
    opportunities.push({
      title: "Backlink gap vs. tracked competitors",
      description: "Other sites link to your competitors but haven't linked to you yet.",
      evidence,
      impact: backlinkGapDomainCount >= 10 ? "high" : "medium",
      category: "seo_backlink_gap",
      recommended_action: "Review these referring domains for realistic outreach targets — directories, local press, or partner sites relevant to your industry.",
      claude_prompt: claudePromptFor(
        businessName,
        domain,
        evidence,
        "Draft a short, non-spammy outreach email template I could adapt for reaching out to a site that already links to a competitor, asking them to consider linking to us too. Leave placeholders for the specific site name and why we'd be relevant to their audience.",
      ),
    });
  }

  return opportunities;
}
