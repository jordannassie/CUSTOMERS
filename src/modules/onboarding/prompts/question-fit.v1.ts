// Fit check for an "Other" business's written questions, prompt v1 (2026-10-16, MVP_SPEC 5.3). The writer sees only
// the kind of business (BUG-130), so for an unlisted kind some questions drift to a different trade: a sportswear
// store got gym questions, an IT consultant got computer repair shop ones. One cheap call checks all 12 at once and
// the code replaces the ones that do not fit (other-fit.ts). The eval in evals/question-picking/other-fit.ai.eval.ts
// imports this file; changing it means rerunning that eval (MVP_SPEC 25).
import { z } from "zod";

export const FIT_PROMPT_VERSION = "question-fit.v1";
export const FIT_MODEL = "claude-haiku-4-5";
export const FIT_MAX_TOKENS = 800;
/** Check, replace the misfits, check the replacements: never more than this many fit calls per set. */
export const MAX_FIT_ROUNDS = 2;

export type FitBusiness = {
  /** The user's own words for the kind of business: "sportswear store". */
  type: string;
  services: string[];
  /** "Austin, TX". */
  city: string;
};

export const FIT_SYSTEM = `You check questions that we ask ChatGPT, Claude and Perplexity to see which local businesses they recommend. You get one kind of business, the services it offers, its city, and a numbered list of questions a customer might type.

For each question, answer one thing: would a customer asking this question be well served if the AI recommended a business of this kind that offers these services in this city?

Answer yes when:
- the question asks for this kind of business, or for something this kind of business sells or does, even if this business does not name it among its services;
- the question is general ("Which one do locals recommend?", "Which has fair prices?") and asks about this kind of business.

Answer no when:
- the question is really looking for a different kind of business (a gym for a sportswear store, a computer repair shop for an IT consultant, a library for a bookstore);
- the question asks about something this kind of business does not offer;
- the question would be answered with advice, products or brands instead of a local business.

Judge each question on its own. Return one answer for every number.`;

export function fitUserMessage(business: FitBusiness, questions: string[]): string {
  const services = business.services.length ? business.services.join("; ") : "(none listed)";
  const list = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
  return `Kind of business: ${business.type}\nServices: ${services}\nCity: ${business.city}\n\nQuestions:\n${list}`;
}

export const fitOutput = z.object({
  answers: z.array(z.object({ number: z.number().int(), fits: z.enum(["yes", "no"]) })),
});
export type FitOutput = z.infer<typeof fitOutput>;
