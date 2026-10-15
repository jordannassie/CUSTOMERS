import { describe, expect, it } from "vitest";
import { FLORIST_BUSINESS, FLORIST_WRITTEN, fakeQuestionClients } from "./question-fixtures";
import { hasPlaceholder, isFairQuestion } from "./question-rules";
import { prepareQuestions } from "./questions";

// 2026-10-15: "Which is better for chemical peels, med spa A or med spa B in New York, NY?" (Perfect Med Spa) and
// two more like it were written by the model; stand-ins are dropped from library, written and reused questions.
describe("hasPlaceholder", () => {
  it("catches stand-in names and leftover placeholders", () => {
    for (const q of [
      "Which is better for chemical peels, med spa A or med spa B in New York, NY?",
      "Which is better for cosmetic dental work in Los Angeles, CA, dentist A or B?",
      "Which is better for a romantic dinner in Alexandria, LA, option A or option B?",
      "Should I pick business A or business B for a kitchen remodel in {city}?",
      "Is X or Y the better plumber in {city}?",
      "How does Company A compare for brake repair in {city}?",
      "Is [name] the best dentist in {city}?",
      "Which <industry> in {city} has the best reviews?",
      "Which {industry} in {city} is cheapest?",
    ]) {
      expect(hasPlaceholder(q), q).toBe(true);
      expect(isFairQuestion(q), q).toBe(false);
    }
  });

  it("leaves real questions alone", () => {
    for (const q of [
      "Which is better in {city} for straightening teeth, traditional braces or clear aligners?",
      "Which is better in {city} for transmission work, a dealership service center or an independent shop?",
      "Should I or my partner book the consultation at a med spa in {city}?",
      "Which pharmacy in {city} has the best vitamin A serums?",
      "I need a plan B for my wedding venue in {city}. Which florist can help?",
      "Who is the best HVAC company in {city} for an A/C tune-up?",
      "Where can I get a grade A steak in {city}?",
    ]) {
      expect(hasPlaceholder(q), q).toBe(false);
    }
  });
});

describe("questions with stand-ins never reach a business", () => {
  it("drops a written one", async () => {
    const bad = { template: "Which is better for a small wedding in {city}, florist A or florist B?", intent: "comparison" as const };
    const { clients } = fakeQuestionClients({ write: [bad, ...FLORIST_WRITTEN] });
    const set = await prepareQuestions(FLORIST_BUSINESS, clients);
    expect(set.questions.some((q) => /florist A|florist B/.test(q.text))).toBe(false);
  });

  it("drops a reused one from another business of the same kind", async () => {
    const city = "Orange, CA";
    const shared = [
      `What is the best florist in ${city}?`,
      `Which is better for wedding flowers in ${city}, florist A or florist B?`,
      `Which florist in ${city} has the best reviews?`,
    ].map((text) => ({ text, intent: "best" as const }));
    const { clients } = fakeQuestionClients({ shared, write: [...FLORIST_WRITTEN] });
    const set = await prepareQuestions(FLORIST_BUSINESS, clients);
    expect(set.questions.map((q) => q.text)).not.toContain(shared[1].text);
  });
});
