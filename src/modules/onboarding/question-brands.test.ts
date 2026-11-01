import { describe, expect, it } from "vitest";
import { FLORIST_BUSINESS, FLORIST_WRITTEN, fakeQuestionClients } from "./question-fixtures";
import { brandWords, namesBrand } from "./question-brands";
import { fallbackQuestions, isFairQuestion, isGeneralQuestion, questionProblem } from "./question-rules";
import { prepareQuestions } from "./questions";

// 2026-10-16: "What toy store in Austin, TX has the best deals on LEGO sets?" can only be won by a shop that stocks
// LEGO, so it scores the business on its stock, not on being recommended.
describe("namesBrand", () => {
  it("catches listed brands in any case, and other capitalised names mid-sentence", () => {
    for (const q of [
      "What toy store in Austin, TX has the best deals on LEGO sets?",
      "Where can I buy original Nike running shoes in Islamabad?",
      "Which toy store in {city} has the biggest selection of legos?",
      "Which coffee shop in {city} makes a better latte than Starbucks?",
      "Who repairs a cracked iPhone screen fastest in {city}?",
      "Which mechanic in {city} specializes in BMW repairs?",
      "Which dentist in {city} is best for Invisalign?",
      "Who offers the best results for CoolSculpting in {city}?",
      "Which beauty store in {city} carries Fenty products?",
      "Which fast food place in {city} has better fries than mcdonald's?",
      // Not on the list, caught by the capital letter.
      "Which shoe store in {city} sells genuine Bata sandals?",
      "Is there a cafe in {city} like Philz with good pour-over?",
      "Which grocery in {city} carries Shan spice mixes?",
    ]) {
      expect(namesBrand(q), q).toBe(true);
      expect(questionProblem(q), q).toBe("brand");
      expect(isFairQuestion(q), q).toBe(false);
    }
  });

  it("keeps places, acronyms, days, cuisines, nationalities, review sites and generic treatments", () => {
    for (const q of [
      "Which dentist in Central LA, Los Angeles, CA has the best reviews?",
      "I just moved to Bayview, San Francisco, CA and need a plumber, who would you recommend?",
      "Which Austin, TX software company is best for developing a SaaS product from scratch?",
      "Which mechanic in Police Foundation, Islamabad is known for honest work?",
      "Which HVAC contractor in {city} is best for AC repair?",
      "Which tax attorney in {city} has the best reputation for resolving IRS disputes?",
      "Does any salon in {city} take bookings for Sundays?",
      "I can't decide between sushi or Thai in {city}; which restaurant is more popular?",
      "Which shop in {city} is more reliable for European cars versus American-made vehicles?",
      "Where can I find high-quality Pakistani clothing brands in Islamabad?",
      "Which coffee shop in Seattle, WA has the best reviews on Google?",
      "Which med spa in {city} has the most experienced Botox injectors?",
      "Which med spa in {city} is best for fillers and laser hair removal?",
      "Which dentist in {city} offers clear aligners at a fair price?",
      "Which toy store in {city} has the best building blocks?",
      "Which coffee shop in {city} has the fastest Wi-Fi for working?",
      "I'm looking for a good dentist in {city}. Which one should I choose?",
      "Which restaurant in {city} is best for a Valentine's dinner?",
      "Which store in {city} has an affordable target price for kids' shoes?",
    ]) {
      expect(namesBrand(q), q).toBe(false);
    }
  });

  it("uses the business's own place for filled-in questions it could not tell apart", () => {
    const q = "Which Brentwood toy store do parents trust most?";
    expect(namesBrand(q)).toBe(true);
    expect(namesBrand(q, ["Brentwood", "TN"])).toBe(false);
    expect(isGeneralQuestion("Which toy store in Brentwood, TN do locals recommend?", "toy store", "Brentwood", "TN", [])).toBe(true);
  });

  it("finds the listed brands in a typed kind of business", () => {
    expect(brandWords("Nike store")).toEqual(["Nike"]);
    expect(brandWords("LEGO and Barbie toy shop")).toEqual(["LEGO", "Barbie"]);
    expect(brandWords("Botox clinic")).toEqual([]);
    expect(brandWords("toy store")).toEqual([]);
  });
});

describe("brands and names never reach a business's questions", () => {
  it("drops written questions with a brand, and keeps a brand out of the kind of business", async () => {
    const lego = { template: "Which toy store in {city} has the best LEGO sets?", intent: "best" as const };
    const { clients } = fakeQuestionClients({ write: [lego, ...FLORIST_WRITTEN] });
    const kinds: string[] = [];
    const write = clients.model.write;
    const model = { ...clients.model, write: (input: Parameters<typeof write>[0]) => (kinds.push(input.business.kind), write(input)) };
    const set = await prepareQuestions({ ...FLORIST_BUSINESS, industryText: "Nike florist" }, { ...clients, model });
    expect(set.questions.some((q) => /LEGO|Nike/i.test(q.text))).toBe(false);
    expect(kinds.length).toBeGreaterThan(0);
    expect(kinds.some((k) => /nike/i.test(k))).toBe(false);
  });

  it("drops written questions that name a competitor", async () => {
    const named = { template: "Is Petal Pushers the best florist in {city}?", intent: "best" as const };
    const lower = { template: "Which florist in {city} is better than petal pushers for weddings?", intent: "comparison" as const };
    const { clients } = fakeQuestionClients({ write: [named, lower, ...FLORIST_WRITTEN] });
    const set = await prepareQuestions({ ...FLORIST_BUSINESS, competitors: ["Petal Pushers"] }, clients);
    expect(set.questions.some((q) => /petal pushers/i.test(q.text))).toBe(false);
  });
});

// 2026-10-16: "Which of the top dentist options in Los Angeles, CA compares best?" read like a form, not a person.
describe("plain fallback questions", () => {
  it("read like a person and pass every rule, with the place filled in", () => {
    for (const [noun, city, region] of [
      ["coffee shop", "Austin", "TX"],
      ["toy store", "Brentwood", "TN"],
      ["dentist", "Los Angeles", "CA"],
      ["HVAC contractor", "New York", "NY"],
      ["florist", "Islamabad", null],
    ] as const) {
      const set = fallbackQuestions(noun, city, region);
      expect(set).toHaveLength(12);
      for (const q of set) {
        expect(questionProblem(q.text, [city, region ?? ""]), q.text).toBeNull();
        expect(isGeneralQuestion(q.text, noun, city, region, []), q.text).toBe(true);
        expect(q.text).not.toMatch(/compares best|options in/);
      }
    }
  });
});
