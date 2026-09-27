// The dev server's and Playwright's stand-ins for Firecrawl, Google Places and Claude during onboarding
// (ONBOARDING_FIXTURES). Built from the hand-made test fixtures; no provider is ever called.
import type { Intent } from "@/modules/question-library";
import type { AutofillClients } from "./autofill";
import type { PageResult } from "./firecrawl";
import { BLOCKED_DOMAIN, BLOCKED_PAGES, BLOCKED_PLACE, COFFEE_DOMAIN, COFFEE_PAGES, COFFEE_PLACE, COFFEE_SITE_OUTPUT } from "./fixtures";
import { ExtractError } from "./extract";
import type { QuestionModel } from "./question-model";
import { QUESTION_COUNT } from "./prompts/pick-questions.v1";

const SITES: Record<string, PageResult[]> = { [COFFEE_DOMAIN]: COFFEE_PAGES, [BLOCKED_DOMAIN]: BLOCKED_PAGES };

// Any other domain finds nothing, which shows the empty form with its friendly note.
export const fixtureAutofillClients: AutofillClients = {
  scrape: async (domain) => SITES[domain] ?? [],
  searchPlaces: async (query) => {
    const q = query.toLowerCase();
    if (q.includes(COFFEE_DOMAIN) || q.includes("sunrise coffee")) return [COFFEE_PLACE];
    if (q.includes(BLOCKED_DOMAIN)) return [BLOCKED_PLACE];
    return [];
  },
  extract: async ({ domain }) => {
    if (domain === COFFEE_DOMAIN) return COFFEE_SITE_OUTPUT;
    throw new ExtractError("no fixture for this domain", false);
  },
};

const WRITTEN: { template: string; intent: Intent }[] = [
  ["Who is the best {trade} in {city}?", "best"],
  ["Which {trade} in {city} do locals recommend?", "reviews"],
  ["Which {trade} in {city} can help me today?", "urgent"],
  ["What is an affordable {trade} in {city}?", "price"],
  ["What is the best reviewed {trade} in {city}?", "reviews"],
  ["Which {trade} in {city} is open on weekends?", "urgent"],
  ["Which {trade} in {city} has fair prices?", "price"],
  ["Which {trade} in {city} is best for first-time customers?", "comparison"],
  ["What is the top rated {trade} near {city}?", "best"],
  ["Which {trade} in {city} is better than the big chains?", "comparison"],
  ["Who is the most trusted {trade} in {city}?", "reviews"],
  ["Which {trade} in {city} answers the phone fastest?", "urgent"],
].map(([template, intent]) => ({ template, intent: intent as Intent }));

// Picks the first templates in library order; writes plain questions for a trade with no library.
export const fixtureQuestionModel: QuestionModel = {
  pick: async ({ templates }) => templates.slice(0, QUESTION_COUNT).map((t) => t.number),
  write: async ({ business }) =>
    WRITTEN.map((q) => ({ ...q, template: q.template.replace("{trade}", business.industry.toLowerCase()) })),
};
