// Hand-built fixtures for question picking tests and the fast eval. Made-up templates written for
// the tests; no model was called to make them, and they are not the reviewed library (B-32).
import type { Intent } from "@/modules/question-library";
import type { QuestionModel } from "./question-model";
import type { LibraryEntry } from "./question-rules";
import type { QuestionBusiness, QuestionClients } from "./questions";

const entry = (n: number, template: string, intent: Intent, tags: string[]): LibraryEntry => ({
  id: `coffee-${n}`,
  template,
  intent,
  tags,
});

export const COFFEE_LIBRARY: LibraryEntry[] = [
  entry(1, "What is the best coffee shop in {city}?", "best", ["general"]),
  entry(2, "Which coffee shop in {city} makes the best oat milk latte?", "best", ["oat milk lattes"]),
  entry(3, "Where can I get good pour-over coffee in {city}?", "best", ["pour-over coffee"]),
  entry(4, "Which coffee shop in {city} has the best pastries?", "best", ["pastries"]),
  entry(5, "Which cafe in {city} has the best breakfast sandwiches?", "best", ["breakfast sandwiches"]),
  entry(6, "Which coffee shop in {city} is open early in the morning?", "urgent", ["open early"]),
  entry(7, "Where can I grab a coffee near downtown {city} right now?", "urgent", ["general"]),
  entry(8, "Which coffee shop in {city} is open late at night?", "urgent", ["open late"]),
  entry(9, "What is the most affordable coffee shop in {city}?", "price", ["general"]),
  entry(10, "Which cafe in {city} has a good loyalty deal?", "price", ["loyalty program"]),
  entry(11, "What is the best reviewed coffee shop in {city}?", "reviews", ["general"]),
  entry(12, "Which coffee roaster in {city} do locals recommend?", "reviews", ["coffee roasting"]),
  entry(13, "Which coffee shop in {city} is best for working on a laptop?", "comparison", ["wifi", "workspace"]),
  entry(14, "Which cafe in {city} is best for a first date?", "comparison", ["general"]),
  entry(15, "Which coffee shop in {city} has the best vegan food?", "comparison", ["vegan food"]),
  entry(16, "Which drive-through coffee shop in {city} is fastest?", "urgent", ["drive-through"]),
  entry(17, "Which cafe in {city} is best for bubble tea?", "best", ["bubble tea"]),
  entry(18, "Which coffee shop in {city} serves the best cold brew?", "best", ["cold brew"]),
];

/** The coffee shop from the auto-fill fixtures, which lists oat milk lattes and opens early. */
export const COFFEE_BUSINESS: QuestionBusiness = {
  industry: "coffee_shop",
  services: ["espresso drinks", "oat milk lattes", "pour-over coffee", "pastries", "breakfast sandwiches"],
  description: "A neighborhood cafe in Springfield that roasts its own beans and opens at 6am.",
  city: "Springfield",
  region: "IL",
};

/** What a good pick for COFFEE_BUSINESS looks like: its own services and hours, a mix of intents. */
export const COFFEE_GOOD_PICK = [2, 6, 3, 1, 4, 5, 11, 12, 9, 7, 13, 14];

export const FLORIST_BUSINESS: QuestionBusiness = {
  industry: "other",
  industryText: "Florist",
  services: ["wedding flowers", "same-day delivery"],
  description: "Family florist making wedding bouquets and delivering the same day.",
  city: "Orange",
  region: "CA",
};

export const FLORIST_WRITTEN = [
  { template: "Who is the best florist in {city}?", intent: "best" },
  { template: "Which florist in {city} does the best wedding flowers?", intent: "best" },
  { template: "Which florist in {city} can deliver flowers today?", intent: "urgent" },
  { template: "Where can I get same-day flower delivery in {city}?", intent: "urgent" },
  { template: "What is an affordable florist in {city} for a wedding?", intent: "price" },
  { template: "Which florist in {city} has fair prices for bouquets?", intent: "price" },
  { template: "What is the best reviewed florist in {city}?", intent: "reviews" },
  { template: "Which florist in {city} do brides recommend?", intent: "reviews" },
  { template: "Which florist in {city} is best for a small wedding?", intent: "comparison" },
  { template: "Which flower shop in {city} is best for sympathy flowers?", intent: "comparison" },
  { template: "Which florist in {city} has the most unique arrangements?", intent: "best" },
  { template: "Which florist in {city} is open on Sundays?", intent: "urgent" },
] as const;

export type FakeModelCalls = { pick: number; write: number };

/** A model that answers from fixtures, or throws like an API outage when an answer is an Error. */
export function fakeQuestionClients(
  opts: {
    library?: Record<string, LibraryEntry[]>;
    pick?: number[] | Error;
    write?: { template: string; intent: Intent }[] | Error;
  } = {},
): { clients: QuestionClients; calls: FakeModelCalls } {
  const calls: FakeModelCalls = { pick: 0, write: 0 };
  const answer = <T,>(value: T | Error | undefined, what: string): T => {
    if (value instanceof Error) throw value;
    if (value === undefined) throw new Error(`no fixture answer for ${what}`);
    return value;
  };
  const model: QuestionModel = {
    pick: async () => {
      calls.pick++;
      return answer(opts.pick, "pick");
    },
    write: async () => {
      calls.write++;
      return answer(opts.write, "write");
    },
  };
  return { clients: { loadLibrary: async (industry) => opts.library?.[industry] ?? [], model }, calls };
}
