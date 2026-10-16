// Question library drafting, prompt v4 (MVP_SPEC 5.3, D-62). Output is only a draft: a person reviews
// every template before it is loaded. Changing this prompt means redrafting and re-reviewing the library.
import { z } from "zod";
import { INDUSTRY_LABELS, type LibraryIndustry } from "@/lib/industries";
import { CITY, INTENTS } from "../schema";

// v2 (2026-10-13): questions read like different people typing, a third in the first person with context, and
// varied openings, the same guidance as pick-questions.v5 (now v6).
// v3 (2026-10-15): a comparison names two real options, never stand-ins like "dentist A or B" (pick-questions.v7).
// v4 (2026-10-16): full, natural questions that ask which business to go to; no choice between options or kinds of
// business ("a chain or a local shop", "braces or clear aligners"); no product brand or business name (LEGO, Nike,
// Invisalign; Botox is fine). A comparison names the business as its subject (pick-questions.v8). Of the 399 v1
// templates, onboarding's code now drops the ones listed in evals/question-picking/README.md.
export const GENERATE_PROMPT_VERSION = "question-library.v4";
export const GENERATE_MODEL = "claude-sonnet-5";
export const GENERATE_MAX_TOKENS = 8_000;
export const TEMPLATES_PER_INDUSTRY = 40;

export const GENERATE_SYSTEM = `You write the questions a real local customer would type into ChatGPT, Claude or Perplexity when looking for a local business. The questions are used to check which businesses the AI recommends in a city.

Rules for every question:
- A full, natural question, the way a person really asks, ending with "?". One question per template. It asks which business to go to. Never a fragment such as "Which is cheaper, the coffee shops in ${CITY}?" or a bare search phrase such as "Best plumber in ${CITY}?".
- Write them the way different people type. About a third in the first person, with a little context about their situation ("I just moved to ${CITY} and need...", "My car is making a grinding noise, which..."), the rest short and direct. The context must fit most customers of this kind of business, never a time ("today", "tonight").
- Vary how they start: no more than three may begin with the same two words (not a list of "Where can I find...").
- Always include the placeholder ${CITY} exactly once, where the city name goes (for example "Who is the best dentist in ${CITY}?"). No other placeholders.
- Never name a business, chain, product brand or person, not even a well-known one (no LEGO, Nike, Starbucks, iPhone, Toyota, Invisalign, CoolSculpting). Use the generic word: building blocks, running shoes, clear aligners, body contouring. Botox is fine as the name of the treatment.
- Ask for a recommendation of a local business, not general advice. Never ask which kind of option to choose: no "a chain or a local shop", "a big company or a small one", "a dealership or an independent shop", "braces or clear aligners", "repair or replace", "Is it better to...", "Should I...or...", "Which type of...".
- Cover the common services of the industry, not only the most obvious one.
- No duplicates or near duplicates.

Each question has:
- intent, one of: best (who is the best or a good choice), urgent (need it now, open late, same day, emergency), price (affordable, cost, deals, financing), reviews (best reviewed, trusted, recommended), comparison (which business is better for a specific need or type of customer, with the business as the subject, like "Which dentist in ${CITY} is best for nervous patients?"; never two options to choose between, and never stand-in names such as "dentist A or B" or "X or Y").
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
