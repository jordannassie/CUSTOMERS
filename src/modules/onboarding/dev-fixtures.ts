// The dev server's and Playwright's stand-ins for Firecrawl, Google Places and Claude during onboarding
// (ONBOARDING_FIXTURES). Built from the hand-made test fixtures; no provider is ever called.
import type { Intent } from "@/modules/question-library";
import type { AutofillClients } from "./autofill";
import type { PageResult } from "./firecrawl";
import {
  BEAN_DOMAIN,
  BEAN_PAGES,
  BEAN_SITE_OUTPUT,
  BLOCKED_DOMAIN,
  BLOCKED_PAGES,
  BLOCKED_PLACE,
  COFFEE_DOMAIN,
  COFFEE_PAGES,
  COFFEE_PLACE,
  COFFEE_SITE_OUTPUT,
  OTHER_PLACE,
} from "./fixtures";
import { ExtractError } from "./extract";
import type { QuestionModel } from "./question-model";
import { QUESTION_COUNT } from "./prompts/pick-questions.v8";

// 2026-10-16 (bennucoffee.com): a site that blocks readers and that Google lists only by its brand, so the user
// picks the listing; and one where Google cannot be reached either. Made-up businesses.
export const BLOCKED_PICK_DOMAIN = "bennu-coffee.example";
export const BLOCKED_DOWN_DOMAIN = "quiet-roasters.example";
const BRAND_LISTINGS = [
  { ...COFFEE_PLACE, placeId: "ChIJ-fixture-bennu-congress", name: "Bennu Coffee", websiteUri: null, address: "515 S Congress Ave, Springfield, IL" },
  { ...OTHER_PLACE, placeId: "ChIJ-fixture-bennu-east", name: "Bennu Coffee East", websiteUri: null, address: "2001 E MLK Blvd, Springfield, IL" },
];

const SITES: Record<string, PageResult[]> = {
  [COFFEE_DOMAIN]: COFFEE_PAGES,
  [BLOCKED_DOMAIN]: BLOCKED_PAGES,
  [BLOCKED_PICK_DOMAIN]: BLOCKED_PAGES,
  [BLOCKED_DOWN_DOMAIN]: BLOCKED_PAGES,
  [BEAN_DOMAIN]: BEAN_PAGES,
};

// Any other domain finds nothing, which shows the empty form with its friendly note.
export const fixtureAutofillClients: AutofillClients = {
  scrape: async (domain) => SITES[domain] ?? [],
  searchPlaces: async (query) => {
    const q = query.toLowerCase();
    if (q.includes(COFFEE_DOMAIN)) return [COFFEE_PLACE];
    // By name, as with no website: two listings, so the user has to pick theirs (MVP_SPEC 3.3).
    if (q.includes("sunrise coffee")) return [COFFEE_PLACE, OTHER_PLACE];
    if (q.includes(BLOCKED_DOMAIN)) return [BLOCKED_PLACE];
    if (q === "bennu coffee") return BRAND_LISTINGS;
    if (q.includes("quiet")) throw new TypeError("fetch failed");
    return [];
  },
  extract: async ({ domain }) => {
    if (domain === COFFEE_DOMAIN) return COFFEE_SITE_OUTPUT;
    if (domain === BEAN_DOMAIN) return BEAN_SITE_OUTPUT;
    throw new ExtractError("no fixture for this domain", false);
  },
};

const WRITTEN: { template: string; intent: Intent }[] = [
  ["Who is the best {trade} in {city}?", "best"],
  ["Which {trade} in {city} do locals recommend?", "reviews"],
  ["Which {trade} in {city} offers same-day service?", "urgent"],
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
