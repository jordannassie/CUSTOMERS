// Drafts one industry's templates with Claude (B-32 step 2). Only scripts/generate-question-library.ts
// calls it; the API key is passed in.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { LibraryIndustry } from "@/lib/industries";
import {
  GENERATE_MAX_TOKENS,
  GENERATE_MODEL,
  GENERATE_SYSTEM,
  generateOutput,
  generateUserMessage,
} from "./prompts/generate-templates.v1";
import type { LibraryTemplate } from "./schema";

export type DraftTemplates = (industry: LibraryIndustry) => Promise<LibraryTemplate[]>;

export function generateRequest(industry: LibraryIndustry) {
  return {
    model: GENERATE_MODEL,
    max_tokens: GENERATE_MAX_TOKENS,
    system: GENERATE_SYSTEM,
    messages: [{ role: "user" as const, content: generateUserMessage(industry) }],
    output_config: { format: zodOutputFormat(generateOutput) },
  };
}

export function createTemplateDrafter(apiKey: string, deps: { fetch?: typeof fetch } = {}): DraftTemplates {
  const client = new Anthropic({ apiKey, fetch: deps.fetch, maxRetries: 2, timeout: 180_000 });
  return async (industry) => toTemplates(industry, await client.messages.create(generateRequest(industry)));
}

export function toTemplates(industry: LibraryIndustry, message: Anthropic.Message): LibraryTemplate[] {
  if (message.stop_reason === "refusal") throw new Error(`Claude declined to draft ${industry}`);
  if (message.stop_reason === "max_tokens") throw new Error(`Claude ran out of output tokens drafting ${industry}`);
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return generateOutput.parse(JSON.parse(text)).templates.map((t) => ({ industry, ...t }));
}
