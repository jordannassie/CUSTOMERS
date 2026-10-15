import { describe, expect, it } from "vitest";
import { FLORIST_BUSINESS, FLORIST_WRITTEN, fakeQuestionClients } from "./question-fixtures";
import { comparesOptions } from "./question-options";
import { asksForBusiness, isFairQuestion } from "./question-rules";
import { prepareQuestions } from "./questions";

// 2026-10-15: "Which is better for skin rejuvenation, microneedling or laser resurfacing at a med spa in New York,
// NY?" (Perfect Med Spa) weighs two treatments, so AI answers it without naming a business.
describe("questions that compare treatments or actions, not businesses", () => {
  it("are dropped", () => {
    for (const q of [
      "Which is better for skin rejuvenation, microneedling or laser resurfacing at a med spa in New York, NY?",
      "Which is better in {city} for straightening teeth, traditional braces or clear aligners?",
      "Which is better for wrinkle reduction in {city}, Botox or microneedling?",
      "Which is better for an older home, furnace repair or full replacement, in {city}?",
      "Which is better for my home in Austin, TX, replacing my old HVAC system versus getting it repaired by a contractor?",
      "Is it better to hire an HVAC contractor or try a DIY fix for my clogged filter in {city}?",
      "Is it better to get balayage or traditional highlights done at a salon in {city}?",
      "What's better for back pain in {city}, massage or acupuncture?",
    ]) {
      expect(comparesOptions(q), q).toBe(true);
      expect(asksForBusiness(q), q).toBe(false);
      expect(isFairQuestion(q), q).toBe(false);
    }
  });

  it("keep questions that weigh kinds of business, or ask which business", () => {
    for (const q of [
      "Which is better in {city} for transmission work, a dealership service center or an independent shop?",
      "Who is better for teeth whitening in Austin, TX, a clinic or an individual dentist?",
      "Which is better for lunch in {city}, a quick casual spot or a sit-down restaurant?",
      "Is it better to choose a solo dental practice or a larger clinic in {city} for routine care?",
      "Is it better to hire a small local HVAC company or a larger chain in {city}?",
      "Is it better to get IV therapy at a med spa or a wellness clinic in {city}?",
      "Which restaurant serves better seafood in {city}, casual or fine dining?",
      "Which bookstore in {city} is better for finding rare or used books?",
      "Which is better for a quick coffee in {city}, or do they all serve the same?",
    ]) {
      expect(comparesOptions(q), q).toBe(false);
    }
  });

  it("never reach a business from the writer", async () => {
    const bad = { template: "Which is better for a wedding in {city}, roses or peonies?", intent: "comparison" as const };
    const { clients } = fakeQuestionClients({ write: [bad, ...FLORIST_WRITTEN] });
    const set = await prepareQuestions(FLORIST_BUSINESS, clients);
    expect(set.questions.some((q) => /roses or peonies/.test(q.text))).toBe(false);
  });
});
