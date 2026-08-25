import "server-only";
import type { VisibilityProviderContext, VisibilityProviderResult } from "@/types/geo";
import { extractMentionSignals, extractCitedSources, type VisibilityProviderAdapter } from "./types";

const MODEL = "claude-3-5-haiku-20241022";

export const anthropicAdapter: VisibilityProviderAdapter = {
  id: "anthropic",
  label: "Claude (Anthropic API)",
  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },
  async run(prompt: string, context: VisibilityProviderContext): Promise<VisibilityProviderResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    const answerText: string = (data.content ?? [])
      .filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n");

    const signals = extractMentionSignals(answerText, context.businessName, context.competitorNames);

    return {
      provider: "anthropic",
      raw: data,
      answerText,
      ...signals,
      citedSources: extractCitedSources(answerText),
      methodology:
        `Queried the Anthropic Messages API (model: ${MODEL}) directly — this is not the same ` +
        `as a live Claude.ai conversation and does not reflect browsing, memory, or ` +
        `personalization a real user session might have.`,
    };
  },
};
