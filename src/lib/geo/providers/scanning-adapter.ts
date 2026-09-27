import "server-only";
import type { VisibilityProviderContext, VisibilityProviderResult } from "@/types/geo";
import { CHECK_MODELS, countryCode, detectMentions, liveCheckRunner, type ProviderId } from "@/modules/scanning";
import type { VisibilityProviderAdapter } from "./types";

// The old visibility flow runs on the new check adapters (B-26, BUG-016): web search with the business
// location and mention detection v2. The new scan engine is src/modules/scanning/service.ts.
export function scanningAdapter(id: ProviderId, label: string, methodology: string): VisibilityProviderAdapter {
  return {
    id,
    label,
    isConfigured() {
      return liveCheckRunner(id) !== null;
    },
    async run(prompt: string, context: VisibilityProviderContext): Promise<VisibilityProviderResult> {
      const runCheck = liveCheckRunner(id);
      if (!runCheck) throw new Error(`${label} is not configured (missing API key).`);

      const result = await runCheck({
        question: prompt,
        location: { city: context.city ?? "", region: context.region ?? "", country: countryCode(context.country ?? null) },
        model: CHECK_MODELS[id],
      });
      const mentions = detectMentions(
        result.answerText,
        { name: context.businessName, website: context.domain, city: context.city },
        context.competitorNames.map((name) => ({ name, city: context.city })),
      );

      return {
        provider: id,
        raw: { model: result.model, usage: result.usage, costUsd: result.costUsd, latencyMs: result.latencyMs },
        answerText: result.answerText,
        businessMentioned: mentions.business.mentioned,
        mentionPosition: mentions.business.position,
        competitorsMentioned: mentions.competitors.filter((c) => c.mentioned).map((c) => ({ name: c.name })),
        citedSources: result.citations.map((c) => (c.title ? { url: c.url, title: c.title } : { url: c.url })),
        methodology,
      };
    },
  };
}
