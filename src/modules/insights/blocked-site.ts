// A website that turned our reader away at setup (business_site_facts) may turn AI tools away too, so the fixes
// always say so, whichever writer ran (2026-10-16, bennucoffee.com). Pure.
import type { OpportunityDraft } from "./explain";
import type { ExplainSources } from "./facts";
import { yourWebsite } from "./your-website";

export const BLOCKED_SITE_TITLE = "Your website blocks automated readers, so some AI tools may not be able to read it";

export function blockedSiteDraft(src: Pick<ExplainSources, "business" | "siteFacts">): OpportunityDraft | null {
  if (!src.business.hasWebsite || yourWebsite(src.siteFacts)?.readStatus !== "blocked") return null;
  const site = src.business.domain ? ` (${src.business.domain})` : "";
  return {
    title: BLOCKED_SITE_TITLE,
    description:
      "AI assistants quote the pages they can open. When your website turns automated visitors away, they rely on what other sites say about you.",
    evidence: `Your website${site} turned our reader away when you set up this business. Sites that block automated visitors often block AI tools too.`,
    impact: "high",
    category: "technical",
    recommended_action: [
      "1. Ask whoever runs your website whether a firewall or bot protection turns away automated visitors.",
      "2. Allow the AI readers GPTBot, ClaudeBot and PerplexityBot in your site's robots.txt and bot protection settings.",
      "3. Open your website on a phone using mobile data to check it loads for a first-time visitor.",
    ].join("\n"),
    claude_prompt: null,
  };
}

/** The fixes with the blocked-website one first, unless a fix about it is already there. Keeps at most `max`. */
export function withBlockedSite(drafts: OpportunityDraft[], src: Pick<ExplainSources, "business" | "siteFacts">, max: number): OpportunityDraft[] {
  const blocked = blockedSiteDraft(src);
  if (!blocked || drafts.some((d) => /\bblock/i.test(d.title))) return drafts.slice(0, max);
  return [blocked, ...drafts].slice(0, max);
}
