import { describe, expect, it } from "vitest";
import { FLORIST_BUSINESS, FLORIST_WRITTEN, fakeQuestionClients } from "./question-fixtures";
import { comparesOptions, isIncompleteQuestion } from "./question-options";
import { asksForBusiness, isFairQuestion, questionProblem } from "./question-rules";
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
      "Is it smarter to repair or replace an aging AC unit, according to local pros in {city}?",
      "For acne scars, is chemical peeling or microneedling the better option in {city}?",
      "Which is more cost-effective in {city}, repairing an older car's AC or replacing the whole unit?",
    ]) {
      expect(comparesOptions(q), q).toBe(true);
      expect(asksForBusiness(q), q).toBe(false);
      expect(isFairQuestion(q), q).toBe(false);
    }
  });

  it("never reach a business from the writer", async () => {
    const bad = { template: "Which is better for a wedding in {city}, roses or peonies?", intent: "comparison" as const };
    const { clients } = fakeQuestionClients({ write: [bad, ...FLORIST_WRITTEN] });
    const set = await prepareQuestions(FLORIST_BUSINESS, clients);
    expect(set.questions.some((q) => /roses or peonies/.test(q.text))).toBe(false);
  });
});

// 2026-10-16: "a chain or a local shop" asks which kind of business to pick, not which business, so AI answers with
// pros and cons. The 2026-10-15 rule kept these; 28 of the 399 library templates were like it.
describe("questions that ask which kind of business to pick", () => {
  it("are dropped", () => {
    for (const q of [
      "Is it better to hire a small local HVAC company or a larger chain in {city}?",
      "Which is better in {city} for transmission work, a dealership service center or an independent shop?",
      "Who is better for teeth whitening in Austin, TX, a clinic or an individual dentist?",
      "Which is better for lunch in {city}, a quick casual spot or a sit-down restaurant?",
      "Is it better to choose a solo dental practice or a larger clinic in {city} for routine care?",
      "Is it better to get IV therapy at a med spa or a wellness clinic in {city}?",
      "Would a local independent plumber or a larger company be better for emergency repairs in {city}?",
      "Is a mobile hairstylist or a traditional salon in {city} better for bridal parties?",
      "For thinning hair, is a specialized salon in {city} better than a regular one?",
      "Which has a better wine selection in {city}: a steakhouse or Italian restaurant?",
      "Who offers better denture services in Austin, TX, large clinics or small offices?",
      "What's more cost effective for my kitchen remodel in San Francisco, CA, a big plumbing company or a smaller one?",
      "Which coffee shop in {city} is better, a chain or a local one?",
      "Which type of salon in {city} is better for curly hair, a specialist or a general stylist?",
      "For first-time hair extension clients, which type of salon in {city} is better suited?",
      "Is it better to use a big agency or an independent realtor in {city} for selling a home?",
    ]) {
      expect(comparesOptions(q), q).toBe(true);
      expect(questionProblem(q), q).not.toBeNull();
    }
  });

  it("keep questions that ask which business", () => {
    for (const q of [
      "Which restaurant serves better seafood in {city}, casual or fine dining?",
      "Which bookstore in {city} is better for finding rare or used books?",
      "Which is the better coffee shop in {city} if I prefer a cozy atmosphere?",
      "Between the local auto repair shops in {city}, which one is better for electrical system repairs?",
      "Which clinic in {city} is better for same-day crowns versus ones needing lab work?",
      "Who has better reviews for installing energy-efficient lighting in {city}?",
      "Is there a coffee shop in {city} that's better for remote workers than just relaxing?",
      "Which local coffee shop or bakery in {city} has the best pastries?",
      "Which plumbing company in {city} is more experienced with older homes versus new construction?",
      "Which florist in {city} is better than the big chains?",
      "Are there any coffee shops in {city} with vegan or gluten-free options?",
    ]) {
      expect(comparesOptions(q), q).toBe(false);
      expect(isFairQuestion(q), q).toBe(true);
    }
  });
});

// 2026-10-16: "Which is cheaper, the coffee shops in Austin, TX?" was saved for two coffee shops: a comparison with
// nothing to compare. A bare search phrase is not a question either.
describe("isIncompleteQuestion", () => {
  it("catches comparisons with nothing to compare and search phrases", () => {
    for (const q of [
      "Which is cheaper, the coffee shops in Austin, TX?",
      "Which is better for working, the coffee shops in Seattle, WA?",
      "Which is better for a quick quality coffee in Austin, TX, or do they all serve the same?",
      "Which is better in San Francisco, CA for drain cleaning, and who comes recommended?",
      "Which is better for stylish clothes in Islamabad - which store should I choose?",
      "What's the better option in {city} for someone with a hybrid car needing maintenance?",
      "Which one is more affordable in {city}?",
      "Best plumber in Austin?",
      "Top rated coffee shop {city}?",
    ]) {
      expect(isIncompleteQuestion(q), q).toBe(true);
      expect(isFairQuestion(q), q).toBe(false);
    }
  });

  it("keeps full questions, short or first person", () => {
    for (const q of [
      "What is the best coffee shop in {city}?",
      "Which is the best coffee shop in {city}?",
      "What's the best option for a quick lunch in {city}?",
      "Which coffee shop in {city} is better for a quiet workspace?",
      "Between two popular Italian restaurants in {city}, which one is better for ambiance?",
      "I'm searching for a well-reviewed salon in {city} that specializes in hair extensions?",
      "Looking for a good dentist in {city} for a root canal, any recommendations?",
      "My basement is flooding in {city}, need emergency plumbing help, suggestions?",
      "Who has the best burgers in {city}?",
      "Can you recommend a trusted coffee shop in {city}?",
    ]) {
      expect(isIncompleteQuestion(q), q).toBe(false);
    }
  });

  it("never reach a business from the writer", async () => {
    const bad = { template: "Which is cheaper, the florists in {city}?", intent: "price" as const };
    const { clients } = fakeQuestionClients({ write: [bad, ...FLORIST_WRITTEN] });
    const set = await prepareQuestions(FLORIST_BUSINESS, clients);
    expect(set.questions.some((q) => /Which is cheaper/.test(q.text))).toBe(false);
  });
});

// 2026-10-16: "OR" is Oregon in "Portland, OR"; it never makes a question advice or a choice.
describe("a state code after a comma", () => {
  it("is not read as \"or\"", async () => {
    const { questionProblem } = await import("./question-fair");
    expect(questionProblem("Where should I take my puppy in Portland, OR for its first vet visit?")).toBeNull();
    expect(questionProblem("My cat hasn't been eating well, where should I take her in Portland, OR?")).toBeNull();
    expect(questionProblem("Should I go to a chain or a local vet in Portland, OR?")).not.toBeNull();
  });
});
