import type { OpportunityCategory, OpportunityImpact } from "@/types/geo";

export interface OpportunityDraft {
  title: string;
  description: string;
  evidence: string;
  impact: OpportunityImpact;
  category: OpportunityCategory;
  recommended_action: string;
  claude_prompt: string;
}

export interface VisibilityResultLike {
  business_mentioned: boolean;
  competitors_mentioned: Array<{ name: string }>;
  cited_sources: Array<{ url: string }>;
}

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

interface OpportunityEngineInput {
  businessName: string;
  domain: string | null;
  description: string | null;
  primaryCity: string | null;
  results: VisibilityResultLike[];
  /** Optional SEO data to generate additional keyword/ranking opportunities */
  seo?: SeoOpportunityInput;
}

function claudePromptFor(
  header: string,
  businessName: string,
  domain: string | null,
  evidence: string,
  ask: string,
): string {
  return [
    `I want AI assistants like ChatGPT, Claude and Perplexity to recommend ${businessName}${domain ? ` (${domain})` : ""} more often.`,
    "",
    `What Customers.Direct found when it asked AI assistants about us. Do not assume any facts beyond what is stated here:`,
    evidence,
    "",
    header,
    ask,
    "",
    "Important: only use real information about this business that I provide or that you find by reading the actual website. Never invent addresses, phone numbers, services, credentials, awards, or testimonials that weren't given to you.",
  ].join("\n");
}

/**
 * Deterministic, evidence-grounded opportunity generator. Every opportunity
 * it produces cites a specific number pulled from real stored results;
 * it never invents a reason for a ranking change or a fact about the
 * business it wasn't given.
 */
export function generateOpportunities(input: OpportunityEngineInput): OpportunityDraft[] {
  const { businessName, domain, description, primaryCity, results, seo } = input;
  const opportunities: OpportunityDraft[] = [];
  const promptsTested = results.length;

  if (promptsTested === 0) {
    return opportunities;
  }

  const mentionedCount = results.filter((r) => r.business_mentioned).length;
  const mentionRate = mentionedCount / promptsTested;
  const mentionPct = Math.round(mentionRate * 100);

  // A) Overall mention rate
  if (mentionRate < 0.5) {
    const impact: OpportunityImpact = mentionRate < 0.2 ? "high" : "medium";
    const evidence = `AI assistants mentioned ${businessName} in ${mentionedCount} of ${promptsTested} questions customers ask (${mentionPct}%).`;
    opportunities.push({
      title: mentionedCount === 0 ? "AI assistants don't mention you yet" : "AI assistants leave you out of most answers",
      description:
        mentionedCount === 0
          ? "None of the answers we checked named your business, so customers who ask AI hear about other businesses instead."
          : "Most of the answers we checked left your business out, so customers who ask AI often hear about other businesses first.",
      evidence,
      impact,
      category: "content",
      recommended_action:
        "Add clear answers to the questions customers ask on your website: what you offer, the areas you serve, and a page of common questions. AI assistants repeat plain, specific answers they can find.",
      claude_prompt: claudePromptFor(
        "Ask:",
        businessName,
        domain,
        evidence,
        "Draft an outline for a services and common questions section that clearly and specifically answers what customers in this industry ask, written so an AI assistant could quote it directly as a factual answer. Leave placeholders for any specific facts (pricing, credentials, service area) I need to fill in myself.",
      ),
    });
  }

  // B) Citation rate
  if (domain) {
    const cited = results.filter((r) => r.cited_sources.some((s) => s.url.includes(domain)));
    if (cited.length === 0) {
      const evidence = `None of the ${promptsTested} AI answers in your latest scan linked to a page on ${domain}.`;
      opportunities.push({
        title: "AI assistants don't link to your website",
        description: "When AI assistants answer, they point to other websites as the source, not yours.",
        evidence,
        impact: "medium",
        category: "citations",
        recommended_action:
          "Give AI assistants pages they can point to: one page for your services and a detailed About page. Then add website info for AI, a short block of code that lists your name, address, phone and services. Copy for Claude can write it for you.",
        claude_prompt: claudePromptFor(
          "Ask:",
          businessName,
          domain,
          evidence,
          "Write schema.org JSON-LD markup (Organization and LocalBusiness types) for this website. Only include fields I can confirm. Leave a clear placeholder comment for anything I need to provide (address, phone, hours, etc.).",
        ),
      });
    }
  }

  // C) Competitor gaps
  const competitorCounts = new Map<string, number>();
  for (const result of results) {
    for (const competitor of result.competitors_mentioned) {
      competitorCounts.set(competitor.name, (competitorCounts.get(competitor.name) ?? 0) + 1);
    }
  }
  const gaps = Array.from(competitorCounts.entries())
    .filter(([, count]) => count > mentionedCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  for (const [competitorName, count] of gaps) {
    const gap = count - mentionedCount;
    const evidence = `AI assistants mentioned "${competitorName}" in ${count} of the same ${promptsTested} questions, and ${businessName} in ${mentionedCount}.`;
    opportunities.push({
      title: `AI assistants pick ${competitorName} more often than you`,
      description: "A competitor you track comes up more often than you when customers ask the same questions.",
      evidence,
      impact: gap >= 3 ? "high" : "medium",
      category: "competitor_gap",
      recommended_action: `Look at the website and Google Business Profile of ${competitorName}. Note what they show that you don't, such as service pages, reviews or business details, then add the same kind of information to your own site.`,
      claude_prompt: claudePromptFor(
        "Ask:",
        businessName,
        domain,
        evidence,
        `Suggest 3 to 5 concrete, specific website or content improvements ${businessName} could make to close this gap. Base suggestions only on general advice for being recommended by AI assistants (schema markup, clear service pages, facts an assistant can quote). Do not assume what ${competitorName} does differently since I haven't provided that.`,
      ),
    });
  }

  // D) Missing description
  if (!description || description.trim().length < 40) {
    const evidence = description
      ? `Your saved business description is only ${description.trim().length} characters long.`
      : "There is no business description on file, and our check of your website didn't find one either.";
    opportunities.push({
      title: "Your business description is short or missing",
      description: "AI assistants lean on the words on your own website to understand what you do.",
      evidence,
      impact: "medium",
      category: "entity_consistency",
      recommended_action:
        "Write 2 or 3 clear sentences about what you do and where you do it. Put them on your homepage, your About page and your homepage's search description.",
      claude_prompt: claudePromptFor(
        "Ask:",
        businessName,
        domain,
        evidence,
        "Draft 3 versions of a clear, specific business description of 2 or 3 sentences that I can use as a meta description and as the intro of my About page. Use placeholders for any facts you don't have (exact services, years in business, service area).",
      ),
    });
  }

  // E) Missing location; a settings task, so there is nothing to copy for Claude.
  if (!primaryCity) {
    opportunities.push({
      title: "Your city is missing",
      description: "Without your city we can't ask AI the local questions your customers ask.",
      evidence: "No main city is set for this business.",
      impact: "low",
      category: "local_presence",
      recommended_action: "Add the main city or area you serve in Settings, so we can check the questions local customers ask.",
      claude_prompt: "",
    });
  }

  // F) SEO keyword gaps (if SEO data is available)
  if (seo?.keywordGaps && seo.keywordGaps.length > 0) {
    const topGap = seo.keywordGaps
      .sort((a, b) => b.searchVolume - a.searchVolume)
      .slice(0, 1)[0];

    if (topGap && topGap.searchVolume > 50) {
      const evidence = `About ${topGap.searchVolume.toLocaleString()} people search Google for "${topGap.keyword}" each month. ${topGap.competitorDomain} shows up at position ${topGap.competitorPosition}, and your website does not show up at all.`;
      opportunities.push({
        title: `Customers search for "${topGap.keyword}" and don't find you`,
        description: "A competitor shows up in Google for a search many customers make, and you don't, so those visits go to them.",
        evidence,
        impact: topGap.searchVolume > 500 ? "high" : "medium",
        category: "content",
        recommended_action: `Add or improve a page about "${topGap.keyword}". Describe the service clearly, say which areas you serve, answer common questions, and add website info for AI.`,
        claude_prompt: claudePromptFor(
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
      opportunities.push({
        title: `You are close to the first page of Google for "${best.keyword}"`,
        description: "Your page is just outside the first page of Google results, so a few changes could bring it many more visits.",
        evidence,
        impact: best.searchVolume > 200 ? "high" : "medium",
        category: "content",
        recommended_action: `Improve the page that shows up for "${best.keyword}": a clearer title and heading, more detail on the service, links to it from your other pages, and website info for AI.`,
        claude_prompt: claudePromptFor(
          "Ask:",
          businessName,
          domain,
          evidence,
          `I have a page ranking #${best.position} for "${best.keyword}" with ${best.searchVolume.toLocaleString()} monthly searches. Help me improve this page to rank in the top 10. Review what typical top-10 pages for this keyword include, then suggest specific improvements for: title tag, H1, depth of content, FAQ section, internal linking, and schema. Keep suggestions practical and avoid keyword stuffing.`,
        ),
      });
    }
  }

  return opportunities;
}
