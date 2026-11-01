// Drafts one industry's templates with Claude (B-32 step 2); OpenAI answers the same prompt and schema when
// Claude fails (D-84). Only scripts/generate-question-library.ts calls it; the clients are passed in.
import type { LibraryIndustry } from "@/lib/industries";
import { runJob, type AiClients } from "@/modules/ai";
import {
  GENERATE_MAX_TOKENS,
  GENERATE_MODEL,
  GENERATE_SYSTEM,
  generateOutput,
  generateUserMessage,
  type GenerateOutput,
} from "./prompts/generate-templates.v4";
import type { LibraryTemplate } from "./schema";

export type DraftTemplates = (industry: LibraryIndustry) => Promise<LibraryTemplate[]>;

export function generateRequest(industry: LibraryIndustry) {
  return {
    task: "question_library",
    model: GENERATE_MODEL,
    maxTokens: GENERATE_MAX_TOKENS,
    system: GENERATE_SYSTEM,
    user: generateUserMessage(industry),
    schema: generateOutput,
    timeoutMs: 180_000,
  };
}

export function createTemplateDrafter(ai: AiClients): DraftTemplates {
  return async (industry) => toTemplates(industry, (await runJob(ai, generateRequest(industry))).output);
}

export function toTemplates(industry: LibraryIndustry, output: GenerateOutput): LibraryTemplate[] {
  return output.templates.map((t) => ({ industry, ...t }));
}
