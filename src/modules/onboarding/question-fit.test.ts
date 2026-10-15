// The deterministic fit filter for library templates: cuisine and service questions go only to a business that
// lists them, and short lists are filled with written or plain questions, never with misfits.
import { describe, expect, it } from "vitest";
import { missingTermTags, validateLibrary, type Intent } from "@/modules/question-library";
import { COFFEE_FULL_BUSINESS, COFFEE_GOOD_PICK, COFFEE_LIBRARY, fakeQuestionClients } from "./question-fixtures";
import { balancePicks, fillCity, fitsBusiness, isFairQuestion, type LibraryEntry } from "./question-rules";
import { prepareQuestions, type QuestionBusiness } from "./questions";
import { QUESTION_COUNT } from "./prompts/pick-questions.v7";

const lib = (prefix: string, rows: [string, Intent, string[]][]): LibraryEntry[] =>
  rows.map(([template, intent, tags], i) => ({ id: `${prefix}-${i + 1}`, template, intent, tags }));

// A restaurant library with the cuisine templates a real one has, each tagged with what it names.
const RESTAURANT_LIBRARY = lib("restaurant", [
  ["What is the best restaurant in {city}?", "best", ["general"]],
  ["Which restaurant in {city} has the best sushi?", "best", ["sushi"]],
  ["Where can I get the best steak in {city}?", "best", ["steak", "steakhouse"]],
  ["Which restaurant in {city} has the best wine list?", "comparison", ["wine"]],
  ["What is the best seafood restaurant in {city}?", "best", ["seafood"]],
  ["Which Italian restaurant in {city} do locals recommend?", "reviews", ["italian"]],
  ["Where can I get the best fried chicken in {city}?", "best", ["fried chicken"]],
  ["Which restaurant in {city} has the best burgers?", "best", ["burgers"]],
  ["Which restaurant in {city} offers fast delivery?", "urgent", ["delivery"]],
  ["What is the most affordable restaurant in {city}?", "price", ["general"]],
  ["Which restaurant in {city} has the best reviews?", "reviews", ["general"]],
  ["Which restaurant in {city} do locals recommend?", "reviews", ["general"]],
  ["Which restaurant in {city} has fair prices for families?", "price", ["family", "value"]],
  ["Which sushi restaurant in {city} offers the best value?", "price", ["sushi"]],
  ["Which steakhouse in {city} is best for a special occasion?", "comparison", ["steak", "steakhouse"]],
  ["Which restaurant in {city} has the best vegan menu?", "comparison", ["vegan"]],
  ["Which restaurant in {city} is open late tonight?", "urgent", ["late night"]],
]);

const KFC: QuestionBusiness = {
  industry: "restaurant",
  services: ["fried chicken", "burgers", "delivery"],
  description: "Fast food chain serving fried chicken buckets, burgers and fries, with delivery.",
  city: "Islamabad",
  region: null,
};

const OFF_MENU = /sushi|steak|wine|seafood|italian|vegan/i;

describe("{city} in a template", () => {
  it("fills every {city}, so the placeholder never shows", () => {
    expect(fillCity("Best cafe in {city} or close to {city}?", "Austin, TX")).toBe("Best cafe in Austin, TX or close to Austin, TX?");
  });

  it("leaves out a library template with two {city}, as written ones already were", async () => {
    const twice: LibraryEntry = { id: "twice", template: "Best coffee shop in {city} or near {city}?", tags: ["general"], intent: "best" };
    const { clients } = fakeQuestionClients({ library: { coffee_shop: [twice, ...COFFEE_LIBRARY] }, pick: COFFEE_GOOD_PICK });
    const set = await prepareQuestions(COFFEE_FULL_BUSINESS, clients);
    expect(set.questions.some((q) => q.templateId === "twice" || q.text.includes("{city}"))).toBe(false);
  });
});

describe("library templates that fit the business", () => {
  it("shows the model only templates that fit, under their library numbers", async () => {
    let shown: number[] = [];
    const { clients } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: COFFEE_GOOD_PICK });
    const pick = clients.model.pick;
    clients.model.pick = async (input) => {
      shown = input.templates.map((t) => t.number);
      return pick(input);
    };
    await prepareQuestions(COFFEE_FULL_BUSINESS, clients);
    expect(shown).not.toContain(6);
    expect(shown).not.toContain(8);
    expect(shown).toContain(18);
    expect(input14Fits()).toBe(false);
  });

  it("gives a KFC-like restaurant 12 questions and none about sushi, steak, wine, seafood or Italian", async () => {
    // The model picks the misfits first, as a bad answer would; the code filters them out anyway.
    // The top-up's written questions include pasta and seafood, as the live model wrote once; they are dropped too.
    const written = [
      { template: "Which restaurant in {city} has affordable pasta dishes?", intent: "price" as const },
      { template: "Which restaurant in {city} has the best reviews for its seafood?", intent: "reviews" as const },
      { template: "Which restaurant in {city} is best for a quick family meal?", intent: "comparison" as const },
      { template: "Which restaurant in {city} serves the crispiest fried chicken?", intent: "best" as const },
      { template: "Which restaurant in {city} has the best value combo meals?", intent: "price" as const },
      { template: "Which restaurant in {city} is most popular for takeaway?", intent: "reviews" as const },
      { template: "Which restaurant in {city} gets food to you fastest?", intent: "urgent" as const },
    ];
    const { clients } = fakeQuestionClients({ library: { restaurant: RESTAURANT_LIBRARY }, pick: [2, 3, 4, 5, 6, 14, 15, 1, 7], write: written });
    const set = await prepareQuestions(KFC, clients);
    const texts = set.questions.map((q) => q.text);

    expect(texts).toHaveLength(QUESTION_COUNT);
    expect(texts.filter((t) => OFF_MENU.test(t))).toEqual([]);
    expect(texts).toContain("Where can I get the best fried chicken in Islamabad?");
    expect(texts).toContain("Which restaurant in Islamabad has the best burgers?");
    expect(texts.every((t) => isFairQuestion(t))).toBe(true);
  });

  it("gives a restaurant with no services only the general templates, then written or plain questions", async () => {
    const { clients, calls } = fakeQuestionClients({ library: { restaurant: RESTAURANT_LIBRARY }, write: new Error("no write") });
    const set = await prepareQuestions({ ...KFC, services: [], description: "" }, clients);
    const fromLibrary = set.questions.filter((q) => q.templateId).map((q) => q.templateId);

    expect(calls.pick).toBe(0);
    expect(fromLibrary.sort()).toEqual(["restaurant-1", "restaurant-10", "restaurant-11", "restaurant-12"]);
    expect(set.questions).toHaveLength(QUESTION_COUNT);
    expect(set.questions.some((q) => OFF_MENU.test(q.text))).toBe(false);
  });

  it("checks cuisines against the description too", () => {
    const ctx = { kind: "restaurant", city: "Austin", region: "TX", services: ["dinner"], description: "Family sushi bar with omakase." };
    expect(fitsBusiness(RESTAURANT_LIBRARY[1], ctx)).toBe(true);
    expect(fitsBusiness(RESTAURANT_LIBRARY[2], ctx)).toBe(false);
    expect(fitsBusiness(RESTAURANT_LIBRARY[0], ctx)).toBe(true);
  });
});

// Plumbers and dentists: every template is general or about a service they list, so the filter changes nothing.
const PLUMBER_LIBRARY = lib("plumber", [
  ["Who is the best plumber in {city}?", "best", ["general"]],
  ["Which plumber in {city} is best for drain cleaning?", "best", ["drain cleaning"]],
  ["Which plumber in {city} offers emergency plumbing?", "urgent", ["emergency plumbing"]],
  ["Who does water heater repair in {city}?", "best", ["water heater repair"]],
  ["What is an affordable plumber in {city}?", "price", ["general"]],
  ["Which plumber in {city} has the best reviews?", "reviews", ["general"]],
  ["Which plumber in {city} do locals recommend?", "reviews", ["general"]],
  ["Which plumber in {city} has fair prices for drain cleaning?", "price", ["drain cleaning"]],
  ["Which plumber in {city} is most trusted for water heater repair?", "reviews", ["water heater repair"]],
  ["Which plumber in {city} can handle a burst pipe fast?", "urgent", ["emergency plumbing", "burst pipe"]],
  ["Which plumbing company in {city} offers the best value?", "comparison", ["general"]],
  ["Which plumber in {city} is better for sewer line repair?", "comparison", ["sewer line repair"]],
  ["What is the most popular plumber in {city}?", "reviews", ["general"]],
  ["Which plumber in {city} gives the best price on water heater replacement?", "price", ["water heater repair"]],
]);
const PLUMBER: QuestionBusiness = {
  industry: "plumber",
  services: ["drain cleaning", "emergency plumbing", "water heater repair", "sewer line repair", "burst pipe repair"],
  description: "Family plumbing company in Las Vegas.",
  city: "Las Vegas",
  region: "NV",
};
const DENTIST_LIBRARY = lib("dentist", [
  ["Who is the best dentist in {city}?", "best", ["general"]],
  ["Which dentist in {city} offers emergency appointments?", "urgent", ["emergency appointments"]],
  ["Which dentist in {city} is best for teeth whitening?", "best", ["teeth whitening"]],
  ["Which dentist in {city} has the best reviews?", "reviews", ["general"]],
  ["What is an affordable dentist in {city}?", "price", ["general"]],
  ["Which dentist in {city} is best for dental implants?", "comparison", ["dental implants"]],
  ["Which dentist in {city} do locals recommend?", "reviews", ["general"]],
  ["Which dentist in {city} has fair prices for cleanings?", "price", ["cleanings"]],
  ["Which dentist in {city} is best for kids?", "comparison", ["pediatric dentistry", "kids"]],
  ["What is the most trusted dentist in {city}?", "reviews", ["general"]],
  ["Which dentist in {city} offers the best value for implants?", "price", ["dental implants"]],
  ["Which dentist in {city} can see me for a toothache quickly?", "urgent", ["emergency appointments", "toothache"]],
  ["Which dentist in {city} is best for Invisalign?", "best", ["invisalign"]],
]);
const DENTIST: QuestionBusiness = {
  industry: "dentist",
  services: ["emergency appointments", "teeth whitening", "dental implants", "cleanings", "pediatric dentistry for kids", "invisalign", "toothache care"],
  description: "Family dental practice in Orange.",
  city: "Orange",
  region: "CA",
};

describe("plumber and dentist sets", () => {
  it.each([
    ["plumber", PLUMBER, PLUMBER_LIBRARY, [2, 3, 4, 1, 6, 5, 11, 12, 9, 10, 13, 8]],
    ["dentist", DENTIST, DENTIST_LIBRARY, [1, 2, 3, 6, 4, 5, 9, 12, 7, 8, 13, 10]],
  ] as const)("are unchanged: the same 12 as before the fit filter (%s)", async (industry, business, library, pick) => {
    const { clients } = fakeQuestionClients({ library: { [industry]: [...library] }, pick: [...pick] });
    const set = await prepareQuestions(business, clients);
    // What the code did before: the model's picks balanced over the whole library, city filled.
    const city = `${business.city}, ${business.region}`;
    const before = balancePicks(pick.map((n) => library[n - 1]), [...library], business.services).map((e) => fillCity(e.template, city));
    expect(set.questions.map((q) => q.text)).toEqual(before);
  });
});

describe("cuisine and service templates name themselves in their tags", () => {
  it("finds a term the tags leave out", () => {
    expect(missingTermTags("Which restaurant in {city} has the best sushi?", ["general"])).toEqual(["sushi"]);
    expect(missingTermTags("Which restaurant in {city} has the best sushi?", ["sushi"])).toEqual([]);
    expect(missingTermTags("Where can I get the best steak and wine in {city}?", ["steak"])).toEqual(["wine"]);
    expect(missingTermTags("Which coffee shop in {city} has the best oat milk lattes?", ["oat milk lattes"])).toEqual([]);
  });

  it("is a validation error in the library file", () => {
    const file = {
      version: 1,
      status: "example",
      promptVersion: "question-library.v1",
      model: "claude-sonnet-5",
      generatedAt: "2026-10-12T00:00:00.000Z",
      review: null,
      templates: [{ industry: "restaurant", template: "Which restaurant in {city} has the best sushi?", tags: ["general"], intent: "best" }],
    };
    const result = validateLibrary(file);
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors.join("\n")).toMatch(/names sushi but its tags do not/);
  });
});

/** The fixture's "first date" template names nothing this coffee shop lists, so it never fits. */
function input14Fits(): boolean {
  return fitsBusiness(COFFEE_LIBRARY[13], { kind: "Coffee shop coffee shop cafe coffeehouse coffee", city: "Springfield", region: "IL", services: COFFEE_FULL_BUSINESS.services, description: COFFEE_FULL_BUSINESS.description });
}
