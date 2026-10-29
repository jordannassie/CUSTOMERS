import type { OpportunityCategory, OpportunityImpact } from "@/types/geo";
import { claudePromptFor } from "./claude-prompt";
import { seoOpportunities, type SeoOpportunityInput } from "./seo-opportunities";

export type { SeoOpportunityInput } from "./seo-opportunities";

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

interface OpportunityEngineInput {
  businessName: string;
  domain: string | null;
  description: string | null;
  primaryCity: string | null;
  results: VisibilityResultLike[];
  /** Optional SEO data to generate additional keyword/ranking opportunities */
  seo?: SeoOpportunityInput;
  /** False when the business has no website: no website steps and nothing to copy for Claude. Defaults to true. */
  hasWebsite?: boolean;
  /** True only when setup read the website; then, and only then, can we say it had no description on it. */
  websiteRead?: boolean;
}

/**
 * Deterministic, evidence-grounded opportunity generator. Every opportunity
 * it produces cites a specific number pulled from real stored results;
 * it never invents a reason for a ranking change or a fact about the
 * business it wasn't given.
 */
export function generateOpportunities(input: OpportunityEngineInput): OpportunityDraft[] {
  const { businessName, domain, description, primaryCity, results, seo, hasWebsite = true, websiteRead = false } = input;
  // A fix on the website gets a "Copy for Claude" prompt only when there is a website for it to go on.
  const prompt = (evidence: string, ask: string) => (hasWebsite ? claudePromptFor("Ask:", businessName, domain, evidence, ask) : "");
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
    // Each result is one AI answer (questions × models), not one question: "0 of 36 answers", not "0 of 36 questions".
    const evidence = `AI assistants mentioned ${businessName} in ${mentionedCount} of ${promptsTested} answers to customer questions (${mentionPct}%).`;
    opportunities.push({
      title: mentionedCount === 0 ? "AI assistants don't mention you yet" : "AI assistants leave you out of most answers",
      description:
        mentionedCount === 0
          ? "None of the answers we checked named your business, so customers who ask AI hear about other businesses instead."
          : "Most of the answers we checked left your business out, so customers who ask AI often hear about other businesses first.",
      evidence,
      impact,
      category: hasWebsite ? "content" : "local_presence",
      recommended_action: hasWebsite
        ? "Add clear answers to the questions customers ask on your website: what you offer, the areas you serve, and a page of common questions. AI assistants repeat plain, specific answers they can find."
        : "Fill in your Google Business Profile in full: what you offer, the areas you serve, your hours and a short description. AI assistants repeat plain, specific answers they can find.",
      claude_prompt: prompt(
        evidence,
        "Draft an outline for a services and common questions section that clearly and specifically answers what customers in this industry ask, written so an AI assistant could quote it directly as a factual answer. Leave placeholders for any specific facts (pricing, credentials, service area) I need to fill in myself.",
      ),
    });
  }

  // B) Citation rate
  if (domain && hasWebsite) {
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
        claude_prompt: prompt(
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
    const evidence = `AI assistants mentioned "${competitorName}" in ${count} of the same ${promptsTested} answers, and ${businessName} in ${mentionedCount}.`;
    opportunities.push({
      title: `AI assistants pick ${competitorName} more often than you`,
      description: "A competitor you track comes up more often than you when customers ask the same questions.",
      evidence,
      impact: gap >= 3 ? "high" : "medium",
      category: "competitor_gap",
      // The next step names where to start: the answers that name them (the Actions card links to them).
      recommended_action: `On the Questions page, open the questions where AI names ${competitorName}. Note the facts those answers give about them, such as services, reviews or opening hours, then add the same facts about you to ${hasWebsite ? "your website and Google Business Profile" : "your Google Business Profile"}.`,
      claude_prompt: prompt(
        evidence,
        `Suggest 3 to 5 concrete, specific website or content improvements ${businessName} could make to close this gap. Base suggestions only on general advice for being recommended by AI assistants (schema markup, clear service pages, facts an assistant can quote). Do not assume what ${competitorName} does differently since I haven't provided that.`,
      ),
    });
  }

  // D) Missing description
  if (!description || description.trim().length < 40) {
    // "Our check didn't find one" only when the check read the site; a blocked or unread site says nothing about it.
    const evidence = description
      ? `Your saved business description is only ${description.trim().length} characters long.`
      : websiteRead
        ? "There is no business description on file, and our check of your website didn't find one either."
        : "There is no business description on file.";
    opportunities.push({
      title: "Your business description is short or missing",
      description: hasWebsite
        ? "AI assistants lean on the words on your own website to understand what you do."
        : "AI assistants lean on the words in your Google Business Profile to understand what you do.",
      evidence,
      impact: "medium",
      category: "entity_consistency",
      recommended_action: hasWebsite
        ? "Write 2 or 3 clear sentences about what you do and where you do it. Put them on your homepage, your About page and your homepage's search description."
        : "Write 2 or 3 clear sentences about what you do and where you do it. Put them in the description of your Google Business Profile.",
      claude_prompt: prompt(
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

  opportunities.push(...seoOpportunities(seo, { businessName, domain, withPrompt: hasWebsite }));

  return opportunities;
}
