import "server-only";
import type {
  VisibilityProviderContext,
  VisibilityProviderId,
  VisibilityProviderResult,
} from "@/types/geo";
import type { VisibilityProviderAdapter } from "./types";
import { openAIAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { perplexityAdapter } from "./perplexity";

const REGISTRY: Record<VisibilityProviderId, VisibilityProviderAdapter | null> = {
  openai: openAIAdapter,
  anthropic: anthropicAdapter,
  perplexity: perplexityAdapter,
  // Google AI Overviews has no public API for this kind of query yet.
  // The slot is reserved so it can be added without touching call sites.
  google_ai_overviews: null,
};

export function listConfiguredProviders(): VisibilityProviderAdapter[] {
  return Object.values(REGISTRY).filter(
    (adapter): adapter is VisibilityProviderAdapter => adapter !== null && adapter.isConfigured(),
  );
}

export function getProvider(id: VisibilityProviderId): VisibilityProviderAdapter | null {
  return REGISTRY[id] ?? null;
}

/**
 * The single entry point every caller in the app should use to query an AI
 * visibility provider. Never fabricates a result: if the provider isn't
 * configured or the call fails, it throws — callers are responsible for
 * recording that as a failed run rather than inventing data.
 */
export async function runVisibilityPrompt(
  providerId: VisibilityProviderId,
  prompt: string,
  context: VisibilityProviderContext,
): Promise<VisibilityProviderResult> {
  const adapter = getProvider(providerId);
  if (!adapter) {
    throw new Error(`Unknown or unsupported visibility provider: ${providerId}`);
  }
  if (!adapter.isConfigured()) {
    throw new Error(`${adapter.label} is not configured (missing API key).`);
  }
  return adapter.run(prompt, context);
}

export type { VisibilityProviderAdapter } from "./types";
export type { VisibilityProviderResult, VisibilityProviderId } from "@/types/geo";
