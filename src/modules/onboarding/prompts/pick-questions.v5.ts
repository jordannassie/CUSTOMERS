// Question picking, prompt v5 (MVP_SPEC 5.3, D-62). The eval in evals/question-picking imports this
// file; changing it means rerunning that eval (MVP_SPEC 25).
// v3: with no library, Claude writes candidates from the industry alone, like a library would hold, never from
// this business's own services or description; the code then picks 12 by service fit. Questions written from a
// shop's own listing ("Which coffee shop sells branded apparel?") were ones only that shop could win, so they
// raised its score by themselves (BUG-130). No questions about opening hours or the time they are asked.
// v4: picking never takes a template about a cuisine, product or service the business does not list (a fried
// chicken restaurant got sushi, steak and wine questions); the code also filters picks by the same rule.
// v5: written questions read like different people typing: about a third in the first person with a little context,
// and varied openings (2026-10-13 review: 45 of 322 began "Where can", only 27% used "I" or "my"). The code also
// spreads the twelve picked across openings (question-style.ts).
import { z } from "zod";
import { INTENTS } from "@/modules/question-library";

export const PICK_PROMPT_VERSION = "pick-questions.v5";
export const PICK_MODEL = "claude-haiku-4-5";
export const PICK_MAX_TOKENS = 1_500;
export const QUESTION_COUNT = 12;
// Enough for a mix of intents: no intent may fill more than a third of the list.
export const MAX_PER_INTENT = 4;
// Candidates written for an industry with no library; the code keeps QUESTION_COUNT of them by service fit.
export const WRITE_COUNT = 20;

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
- Prefer templates about the main services this business actually offers.
- Leave out templates about services the business does not offer.
- Never pick a template about a cuisine, product or service this business does not list.
- Leave out templates that depend on when they are asked, such as "open now" or "today".
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

// Industry without a library yet: the model writes candidates by the same rules as the library
// (question-library/prompts/generate-templates.v1.ts), from the industry alone, and the code fills the city.
export const WRITE_SYSTEM = `You write the questions real local customers type into ChatGPT, Claude or Perplexity when looking for a kind of business. They are used to check which businesses the AI recommends in a city, the same questions for every business of this kind, like a reviewed question library.

Write exactly ${WRITE_COUNT} questions:
- Plain, natural grammar, the way a person really asks. One question each, ending with "?".
- Write them the way different people type. About a third in the first person, with a little context about their situation ("I just moved to ${CITY} and need...", "My car is making a grinding noise, which..."), the rest short and direct. The context must fit most customers of this kind of business, never a time ("today", "tonight").
- Vary how they start: no more than three may begin with the same two words (not a list of "Where can I find...").
- Always include the placeholder ${CITY} exactly once, where the city name goes. No other placeholders. Never write "near me".
- Never name a business, brand, chain, product brand or person.
- Ask for a recommendation of a local business, not general advice.
- Every question must fit most businesses of this kind. A question may name one service or product that most businesses of this kind offer (for a coffee shop: espresso, cold brew, pastries). Never a speciality, add-on or extra that only some offer (subscriptions, merchandise, a diet, an amenity, events), and never two of them in one question.
- Never ask about opening hours or days (open late, open early, open on Sundays, 24 hours) or about when the question is asked (now, today, tonight, this weekend, currently). The checks run at night and each business keeps its own hours.
- Mix the intents: best (who is the best or a good choice), urgent (same day, emergency, quick turnaround), price (affordable, cost, deals), reviews (best reviewed, trusted, recommended), comparison (which one is better for a specific need). At least three different intents, at most ${MAX_PER_INTENT} with the same intent. Skip urgent when this kind of business is never urgent.
- No duplicates or near duplicates.`;

/** Only the kind of business: its own services and description would make questions only it can win (BUG-130). */
export function writeUserMessage(business: PickBusiness): string {
  return `Kind of business: ${business.industry}`;
}

export const writeOutput = z.object({
  questions: z.array(z.object({ template: z.string(), intent: z.enum(INTENTS) })),
});
export type WriteOutput = z.infer<typeof writeOutput>;
