// Question library drafting, prompt v1 (MVP_SPEC 5.3, D-62). Output is only a draft: a person reviews
// every template before it is loaded. Changing this prompt means redrafting and re-reviewing the library.
import { z } from "zod";
import { INDUSTRY_LABELS, type LibraryIndustry } from "@/lib/industries";
import { CITY, INTENTS } from "../schema";

export const GENERATE_PROMPT_VERSION = "question-library.v1";
export const GENERATE_MODEL = "claude-sonnet-5";
export const GENERATE_MAX_TOKENS = 8_000;
export const TEMPLATES_PER_INDUSTRY = 40;

export const GENERATE_SYSTEM = `You write the questions a real local customer would type into ChatGPT, Claude or Perplexity when looking for a local business. The questions are used to check which businesses the AI recommends in a city.

Rules for every question:
- Plain, natural grammar, the way a person really asks. One question per template, ending with "?".
- Always include the placeholder ${CITY} exactly once, where the city name goes (for example "Who is the best dentist in ${CITY}?"). No other placeholders.
- Never name a business, brand, chain, product brand or person.
- Ask for a recommendation of a local business, not general advice.
- Cover the common services of the industry, not only the most obvious one.
- No duplicates or near duplicates.

Each question has:
- intent, one of: best (who is the best or a good choice), urgent (need it now, open late, same day, emergency), price (affordable, cost, deals, financing), reviews (best reviewed, trusted, recommended), comparison (which one is better for a specific need or type of customer).
- tags: 1 to 3 short lowercase service phrases the question is about (for example "emergency dental care", "teeth whitening"). Use "general" when the question is not about one service.

Spread the questions across all five intents, at least 5 per intent.`;

export function generateUserMessage(industry: LibraryIndustry): string {
  return `Industry: ${INDUSTRY_LABELS[industry]}\n\nWrite ${TEMPLATES_PER_INDUSTRY} questions.`;
}

export const generateOutput = z.object({
  templates: z.array(
    z.object({
      template: z.string(),
      tags: z.array(z.string()),
      intent: z.enum(INTENTS),
    }),
  ),
});

export type GenerateOutput = z.infer<typeof generateOutput>;
