// Question picking, prompt v1 (MVP_SPEC 5.3, D-62). The eval in evals/question-picking imports this
// file; changing it means rerunning that eval (MVP_SPEC 25).
import { z } from "zod";
import { INTENTS } from "@/modules/question-library";

export const PICK_PROMPT_VERSION = "pick-questions.v1";
export const PICK_MODEL = "claude-haiku-4-5";
export const PICK_MAX_TOKENS = 1_500;
export const QUESTION_COUNT = 12;
// Enough for a mix of intents: no intent may fill more than a third of the list.
export const MAX_PER_INTENT = 4;

const CITY = "{city}";

export type PickBusiness = { industry: string; services: string[]; description: string };
export type NumberedTemplate = { number: number; template: string; tags: string[]; intent: string };

// The business name is never sent, so it cannot leak into a question (no brand names).
function businessBlock(b: PickBusiness): string {
  const services = b.services.length ? b.services.join("; ") : "(none listed)";
  return `Industry: ${b.industry}\nServices: ${services}\nDescription: ${b.description || "(none)"}`;
}

export const PICK_SYSTEM = `You choose the questions we ask ChatGPT, Claude and Perplexity to check whether a local business gets recommended. You get the business's industry, services and description, and a numbered list of reviewed question templates for that industry.

Pick exactly ${QUESTION_COUNT} templates:
- Prefer templates about the services this business actually offers, and about what makes it stand out in its description (for example opening hours or a speciality).
- Leave out templates about services the business does not offer.
- Keep a mix of intents (best, urgent, price, reviews, comparison): at least three different intents, and at most ${MAX_PER_INTENT} templates with the same intent.
- Include one or two general "best" questions so the list is not only about niche services.

Return the template numbers only, in order of how well they fit.`;

export function pickUserMessage(business: PickBusiness, templates: NumberedTemplate[]): string {
  const list = templates
    .map((t) => `${t.number}. ${t.template} [intent: ${t.intent}; tags: ${t.tags.join(", ")}]`)
    .join("\n");
  return `${businessBlock(business)}\n\nTemplates:\n${list}`;
}

export const pickOutput = z.object({ numbers: z.array(z.number().int()) });
export type PickOutput = z.infer<typeof pickOutput>;

// Industry without a library yet: the model writes templates by the same rules as the library
// (question-library/prompts/generate-templates.v1.ts), and the code fills the city.
export const WRITE_SYSTEM = `You write the questions a real local customer would type into ChatGPT, Claude or Perplexity when looking for a business like the one described. The questions are used to check which businesses the AI recommends in a city.

Write exactly ${QUESTION_COUNT} questions:
- Plain, natural grammar, the way a person really asks. One question each, ending with "?".
- Always include the placeholder ${CITY} exactly once, where the city name goes. No other placeholders.
- Never name a business, brand, chain, product brand or person.
- Ask for a recommendation of a local business, not general advice.
- Fit the services and description of the business, and include one or two general "best" questions.
- Mix the intents: best (who is the best or a good choice), urgent (need it now, open late, same day, emergency), price (affordable, cost, deals), reviews (best reviewed, trusted, recommended), comparison (which one is better for a specific need). At least three different intents, at most ${MAX_PER_INTENT} with the same intent.
- No duplicates or near duplicates.`;

export function writeUserMessage(business: PickBusiness): string {
  return businessBlock(business);
}

export const writeOutput = z.object({
  questions: z.array(z.object({ template: z.string(), intent: z.enum(INTENTS) })),
});
export type WriteOutput = z.infer<typeof writeOutput>;
