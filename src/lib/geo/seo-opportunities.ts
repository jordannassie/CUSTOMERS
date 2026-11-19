// Rules fixes from SEO data, when there is some (F: a search a competitor shows up for, G: a page just off Google's
// first page). Split out of opportunity-engine.ts (2026-10-28). Pure.
import type { OpportunityDraft } from "./opportunity-engine";
import { claudePromptFor } from "./claude-prompt";

export interface SeoOpportunityInput {
  keywordGaps?: Array<{
    keyword: string;
    competitorDomain: string;
    competitorPosition: number;
    searchVolume: number;
    difficulty?: number;
  }>;
  topKeywords?: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
    difficulty?: number;
  }>;
  overviewKeywords?: number;
  overviewTraffic?: number;
}

/** `withPrompt`: false when the business has no website, so there is no page for "Copy for Claude" to write. */
export function seoOpportunities(
  seo: SeoOpportunityInput | undefined,
  { businessName, domain, withPrompt }: { businessName: string; domain: string | null; withPrompt: boolean },
): OpportunityDraft[] {
  const out: OpportunityDraft[] = [];
  const prompt = (header: string, name: string, site: string | null, evidence: string, ask: string) =>
    withPrompt ? claudePromptFor(header, name, site, evidence, ask) : "";

  // F) SEO keyword gaps (if SEO data is available)
  if (seo?.keywordGaps && seo.keywordGaps.length > 0) {
    const topGap = seo.keywordGaps
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 1)[0];

    if (topGap && topGap.searchVolume > 50) {
      const evidence = `About ${topGap.searchVolume.toLocaleString()} people search Google for "${topGap.keyword}" each month. ${topGap.competitorDomain} shows up at position ${topGap.competitorPosition}, and your website does not show up at all.`;
      out.push({
        title: `Customers search for "${topGap.keyword}" and don't find you`,
        description: "A competitor shows up in Google for a search many customers make, and you don't, so those visits go to them.",
        evidence,
        impact: topGap.searchVolume > 500 ? "high" : "medium",
        category: "content",
        recommended_action: `Add or improve a page about "${topGap.keyword}". Describe the service clearly, say which areas you serve, answer common questions, and add website info for AI.`,
        claude_prompt: prompt(
          "Ask:",
          businessName,
          domain,
          evidence,
          `Write a page outline for a new or updated page targeting "${topGap.keyword}". Include: target keyword in title and H1, service description (3 to 4 paragraphs), local relevance signals, FAQ section (5 questions buyers ask), and JSON-LD schema suggestions. Do not invent specific facts. Use placeholders for details I need to fill in.`,
        ),
      });
    }
  }

  // G) SEO ranking opportunities (pages ranking #11 to 20)
  if (seo?.topKeywords && seo.topKeywords.length > 0) {
    const nearMissKeywords = seo.topKeywords.filter(
      (kw) => kw.position >= 11 && kw.position <= 20 && kw.searchVolume > 100,
    );

    if (nearMissKeywords.length > 0) {
      const best = nearMissKeywords.sort((a, b) => b.searchVolume - a.searchVolume)[0];
      const evidence = `Your website shows up at position ${best.position} in Google for "${best.keyword}", which about ${best.searchVolume.toLocaleString()} people search each month. Most people never look past the first 10 results.`;
      out.push({
        title: `You are close to the first page of Google for "${best.keyword}"`,
        description: "Your page is just outside the first page of Google results, so a few changes could bring it many more visits.",
        evidence,
        impact: best.searchVolume > 200 ? "high" : "medium",
        category: "content",
        recommended_action: `Improve the page that shows up for "${best.keyword}": a clearer title and heading, more detail on the service, links to it from your other pages, and website info for AI.`,
        claude_prompt: prompt(
          "Ask:",
          businessName,
          domain,
          evidence,
          `I have a page ranking #${best.position} for "${best.keyword}" with ${best.searchVolume.toLocaleString()} monthly searches. Help me improve this page to rank in the top 10. Review what typical top-10 pages for this keyword include, then suggest specific improvements for: title tag, H1, depth of content, FAQ section, internal linking, and schema. Keep suggestions practical and avoid keyword stuffing.`,
        ),
      });
    }
  }

  return out;
}
