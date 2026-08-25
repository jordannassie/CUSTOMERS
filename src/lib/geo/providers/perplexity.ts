import "server-only";
import type { VisibilityProviderContext, VisibilityProviderResult } from "@/types/geo";
import { extractMentionSignals, extractCitedSources, type VisibilityProviderAdapter } from "./types";

const MODEL = "sonar";

export const perplexityAdapter: VisibilityProviderAdapter = {
  id: "perplexity",
  label: "Perplexity (Sonar API)",
  isConfigured() {
    return Boolean(process.env.PERPLEXITY_API_KEY);
  },
  async run(prompt: string, context: VisibilityProviderContext): Promise<VisibilityProviderResult> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not configured.");

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    const answerText: string = data.choices?.[0]?.message?.content ?? "";
    const apiCitations: string[] = Array.isArray(data.citations) ? data.citations : [];

    const signals = extractMentionSignals(answerText, context.businessName, context.competitorNames);
    const textCitations = extractCitedSources(answerText).map((c) => c.url);
    const citedSources = Array.from(new Set([...apiCitations, ...textCitations])).map((url) => ({ url }));

    return {
      provider: "perplexity",
      raw: data,
      answerText,
      ...signals,
      citedSources,
      methodology:
        `Queried the Perplexity Sonar API directly, which performs live web search as part of ` +
        `answering — closer to real-world AI search behavior than a static-knowledge model, but ` +
        `still an API call, not the consumer Perplexity.ai app.`,
    };
  },
};
