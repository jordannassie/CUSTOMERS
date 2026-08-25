import type {
  VisibilityProviderContext,
  VisibilityProviderId,
  VisibilityProviderResult,
} from "@/types/geo";

export interface VisibilityProviderAdapter {
  id: VisibilityProviderId;
  label: string;
  /** True when the required API key/env var is present. */
  isConfigured(): boolean;
  run(
    prompt: string,
    context: VisibilityProviderContext,
  ): Promise<VisibilityProviderResult>;
}

/**
 * Given a raw model answer and the business/competitor names we're checking
 * for, extract normalized mention signals. Shared across provider adapters
 * so every provider is scored the same way.
 */
export function extractMentionSignals(
  answerText: string,
  businessName: string,
  competitorNames: string[],
): {
  businessMentioned: boolean;
  mentionPosition: number | null;
  competitorsMentioned: Array<{ name: string }>;
} {
  const normalizedAnswer = answerText.toLowerCase();
  const businessMentioned = normalizedAnswer.includes(businessName.toLowerCase());

  let mentionPosition: number | null = null;
  if (businessMentioned) {
    // Approximate "position" by counting distinct business-like mentions
    // (numbered/bulleted list items or paragraph breaks) before the first
    // occurrence of our business name. This is a heuristic, not a precise
    // rank — labeled as such wherever it's surfaced.
    const idx = normalizedAnswer.indexOf(businessName.toLowerCase());
    const before = answerText.slice(0, idx);
    const listMarkers = before.match(/(^|\n)\s*(\d+[.)]|[-*•])\s+/g);
    mentionPosition = listMarkers ? listMarkers.length + 1 : 1;
  }

  const competitorsMentioned = competitorNames
    .filter((name) => name.trim() && normalizedAnswer.includes(name.toLowerCase()))
    .map((name) => ({ name }));

  return { businessMentioned, mentionPosition, competitorsMentioned };
}

/** Very lightweight URL extraction for citation tracking from plain-text answers. */
export function extractCitedSources(answerText: string): { url: string }[] {
  const matches = answerText.match(/https?:\/\/[^\s)"'\]]+/g) ?? [];
  const unique = Array.from(new Set(matches.map((u) => u.replace(/[.,]+$/, ""))));
  return unique.slice(0, 20).map((url) => ({ url }));
}
