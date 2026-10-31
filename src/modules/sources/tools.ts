// The AI tool filter on the Sources page (?tool=chatgpt). Pure, so client components can import it by path.
import type { ProviderId } from "@/modules/scanning";

export const TOOLS: { param: string; provider: ProviderId; label: string }[] = [
  { param: "chatgpt", provider: "openai", label: "ChatGPT" },
  { param: "claude", provider: "anthropic", label: "Claude" },
  { param: "perplexity", provider: "perplexity", label: "Perplexity" },
];

export const MODEL_ORDER: ProviderId[] = TOOLS.map((t) => t.provider);

export const TOOL_LABELS = Object.fromEntries(TOOLS.map((t) => [t.provider, t.label])) as Record<ProviderId, string>;

/** The provider a ?tool= value picks; null for "All tools", including values we don't know. */
export function toolFromParam(param: string | string[] | undefined): ProviderId | null {
  const value = Array.isArray(param) ? param[0] : param;
  return TOOLS.find((t) => t.param === value?.toLowerCase())?.provider ?? null;
}

/** /sources or /sources?tool=claude. */
export function toolHref(provider: ProviderId | null): string {
  const param = TOOLS.find((t) => t.provider === provider)?.param;
  return param ? `/sources?tool=${param}` : "/sources";
}
