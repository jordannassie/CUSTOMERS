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

interface VisibilityResultLike {
  business_mentioned: boolean;
  competitors_mentioned: Array<{ name: string }>;
  cited_sources: Array<{ url: string }>;
}

interface OpportunityEngineInput {
  businessName: string;
  domain: string | null;
  description: string | null;
  primaryCity: string | null;
  results: VisibilityResultLike[];
}

function claudePromptFor(
  header: string,
  businessName: string,
  domain: string | null,
  evidence: string,
  ask: string,
): string {
  return [
    `I'm working on AI search visibility (GEO/AEO) for ${businessName}${domain ? ` (${domain})` : ""}.`,
    "",
    `Context / evidence (from Customers.Direct's real AI visibility monitoring — do not assume any facts beyond what's stated here):`,
    evidence,
    "",
    header,
    ask,
    "",
    "Important: only use real information about this business that I provide or that you find by reading the actual website — never invent addresses, phone numbers, services, credentials, awards, or testimonials that weren't given to you.",
  ].join("\n");
}

/**
 * Deterministic, evidence-grounded opportunity generator. Every opportunity
 * it produces cites a specific number pulled from real stored results —
 * it never invents a reason for a ranking change or a fact about the
 * business it wasn't given.
 */
export function generateOpportunities(input: OpportunityEngineInput): OpportunityDraft[] {
  const { businessName, domain, description, primaryCity, results } = input;
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
    const evidence = `AI mentioned ${businessName} in ${mentionedCount} of ${promptsTested} buyer-intent prompts tested (${mentionPct}%).`;
    opportunities.push({
      title: "Low AI mention rate on buyer-intent prompts",
      description: "Your business isn't showing up in most of the AI answers buyers are likely to see.",
      evidence,
      impact,
      category: "content",
      recommended_action:
        "Publish or expand content on your website that directly answers the buyer-intent prompts we tested — clear service descriptions, service-area pages, and FAQ content AI models can quote and cite.",
      claude_prompt: claudePromptFor(
        "Ask:",
        businessName,
        domain,
        evidence,
        "Draft an outline for a services/FAQ page section that clearly and specifically answers common buyer questions in this industry, written so an AI assistant could quote it directly as a factual answer. Leave placeholders for any specific facts (pricing, credentials, service area) I need to fill in myself.",
      ),
    });
  }

  // B) Citation rate
  if (domain) {
    const cited = results.filter((r) => r.cited_sources.some((s) => s.url.includes(domain)));
    if (cited.length === 0) {
      const evidence = `None of the ${promptsTested} AI responses in your latest run cited a page on ${domain} as a source.`;
      opportunities.push({
        title: "No AI citations of your website",
        description: "AI providers aren't citing your site as a source in their answers.",
        evidence,
        impact: "medium",
        category: "citations",
        recommended_action:
          "Add or strengthen pages AI models can cite by name — a dedicated services page, a detailed About page, and schema.org structured data (Organization / LocalBusiness / Service).",
        claude_prompt: claudePromptFor(
          "Ask:",
          businessName,
          domain,
          evidence,
          "Write schema.org JSON-LD structured data (Organization and LocalBusiness types) for this website. Only include fields I can confirm — leave a clear placeholder comment for anything I need to provide (address, phone, hours, etc.).",
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
    const evidence = `"${competitorName}" was mentioned in ${count} of the same ${promptsTested} prompts, compared to ${mentionedCount} for ${businessName}.`;
    opportunities.push({
      title: `${competitorName} is outperforming you in AI answers`,
      description: `A tracked competitor shows up more often than you do across the same set of prompts.`,
      evidence,
      impact: gap >= 3 ? "high" : "medium",
      category: "competitor_gap",
      recommended_action: `Review ${competitorName}'s website and Google Business Profile for structured data, service pages, and citations that may explain the gap, then close the specific differences you find on your own site.`,
      claude_prompt: claudePromptFor(
        "Ask:",
        businessName,
        domain,
        evidence,
        `Suggest 3-5 concrete, specific website or content improvements ${businessName} could make to close this visibility gap. Base suggestions only on general AI-search best practices (structured data, clear service pages, citable facts) — do not assume what ${competitorName} does differently since I haven't provided that.`,
      ),
    });
  }

  // D) Missing description
  if (!description || description.trim().length < 40) {
    const evidence = description
      ? `Your stored business description is only ${description.trim().length} characters.`
      : "No business description is on file, and our site scan did not find one in your meta tags or structured data.";
    opportunities.push({
      title: "Thin or missing business description",
      description: "AI models rely heavily on your own site text to understand what you do.",
      evidence,
      impact: "medium",
      category: "entity_consistency",
      recommended_action:
        "Add a clear, specific 2-3 sentence description of your business to your homepage meta description and About page.",
      claude_prompt: claudePromptFor(
        "Ask:",
        businessName,
        domain,
        evidence,
        "Draft 3 versions of a clear, specific 2-3 sentence business description I can use as a meta description and About-page intro. Use placeholders for any facts you don't have (exact services, years in business, service area).",
      ),
    });
  }

  // E) Missing location
  if (!primaryCity) {
    opportunities.push({
      title: "No service location on file",
      description: "Location-specific buyer-intent prompts can't be tested without this.",
      evidence: "No primary city is set for this business.",
      impact: "low",
      category: "local_presence",
      recommended_action: "Add your primary service city/region in Settings so we can track location-specific prompts.",
      claude_prompt: claudePromptFor(
        "Ask:",
        businessName,
        domain,
        "No primary service city is on file for this business.",
        "Not applicable — this is a data-entry task in the Customers.Direct dashboard, not a content task.",
      ),
    });
  }

  return opportunities;
}
