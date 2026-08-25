import "server-only";
import type { VisibilityProviderContext, VisibilityProviderResult } from "@/types/geo";
import { extractMentionSignals, extractCitedSources, type VisibilityProviderAdapter } from "./types";

const MODEL = "gpt-4o-mini";

export const openAIAdapter: VisibilityProviderAdapter = {
  id: "openai",
  label: "ChatGPT (OpenAI API)",
  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },
  async run(prompt: string, context: VisibilityProviderContext): Promise<VisibilityProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    const answerText: string = data.choices?.[0]?.message?.content ?? "";

    const signals = extractMentionSignals(answerText, context.businessName, context.competitorNames);

    return {
      provider: "openai",
      raw: data,
      answerText,
      ...signals,
      citedSources: extractCitedSources(answerText),
      methodology:
        `Queried the OpenAI Chat Completions API (model: ${MODEL}) directly — this is not the ` +
        `same as a live ChatGPT.com conversation and does not reflect browsing, memory, or ` +
        `personalization a real user session might have.`,
    };
  },
};
