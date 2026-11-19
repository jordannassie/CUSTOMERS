import { describe, expect, it } from "vitest";
import { FLORIST_BUSINESS, FLORIST_WRITTEN, fakeQuestionClients } from "./question-fixtures";
import { asksForBusiness, dependsOnTime, fallbackQuestions, isGeneralQuestion, mixesServices } from "./question-rules";
import { AREA_QUESTIONS, areaLabel, prepareQuestions } from "./questions";
import { QUESTION_COUNT, writeUserMessage } from "./prompts/pick-questions.v8";

describe("a kind of business with no library (BUG-116)", () => {
  const GENERAL = (c: string, n = "florist") => [
    `What is the best ${n} in ${c}?`,
    `Can you recommend a good ${n} in ${c}?`,
    `Which ${n} in ${c} do locals recommend?`,
    `Which ${n} in ${c} has the best reviews?`,
    `What is the most trusted ${n} in ${c}?`,
    `What is the most popular ${n} in ${c}?`,
    `Which ${n} in ${c} offers the best value?`,
    `Which ${n} in ${c} stands out from the rest?`,
    `Which ${n} in ${c} has fair prices?`,
    `Can you suggest an affordable ${n} in ${c}?`,
    `Which ${n} in ${c} is the most highly rated?`,
    `I'm looking for a good ${n} in ${c}. Which one should I choose?`,
  ];

  it("gets the general questions another business of the same kind in the same city already has, with no model call", async () => {
    const intents = ["best", "reviews", "price", "urgent", "comparison", "best"] as const;
    const shared = GENERAL("Orange, CA").map((text, i) => ({ text, intent: intents[i % 6] }));
    const { clients, calls } = fakeQuestionClients({ shared });
    const set = await prepareQuestions(FLORIST_BUSINESS, clients);
    expect(set).toMatchObject({ source: "written", model: null });
    expect(set.questions.map((q) => q.text)).toEqual(shared.map((q) => q.text));
    expect(calls.write).toBe(0);
  });

  it("leaves the other business's own questions behind and writes the rest from this business's services (A8)", async () => {
    const city = "Austin, TX";
    const theirs = [
      ...GENERAL(city, "bookstore").slice(0, 5),
      `Who can do coffee drinks in ${city} today?`,
      `Where can I buy books and grab breakfast tacos in ${city}?`,
      `Which bookstore in ${city} has reasonably priced coffee and food?`,
      `How much does a used book typically cost in ${city}?`,
    ].map((text, i) => ({ text, intent: (["best", "best", "reviews", "reviews", "price"][i] ?? "price") as "best" | "reviews" | "price" }));
    const { clients, calls } = fakeQuestionClients({ shared: theirs, write: [...FLORIST_WRITTEN] });
    const set = await prepareQuestions({ ...FLORIST_BUSINESS, city: "Austin", region: "TX", industry: "other", industryText: "Bookstore" }, clients);

    const text = set.questions.map((q) => q.text);
    expect(calls.write).toBe(1);
    expect(set.questions).toHaveLength(QUESTION_COUNT);
    expect(text).toEqual(expect.arrayContaining(theirs.slice(0, 5).map((q) => q.text)));
    expect(text.filter((t) => /coffee|tacos|Who can do|typically cost/.test(t))).toEqual([]);
  });

  it("does not copy a question built on the other shop's extras, even when this one lists the same service (A8)", async () => {
    const city = "Austin, TX";
    const theirs = [...GENERAL(city, "bookstore").slice(0, 5), `What's a good local bookstore in ${city} with a coffee shop?`];
    const shared = theirs.map((text) => ({ text, intent: "best" as const }));
    const { clients } = fakeQuestionClients({ shared, write: [...FLORIST_WRITTEN] });
    const bookstore = { ...FLORIST_BUSINESS, city: "Austin", region: "TX", industry: "other", industryText: "Bookstore", services: ["coffee shop", "books"] };
    const set = await prepareQuestions(bookstore, clients);
    expect(set.questions.map((q) => q.text)).not.toContain(theirs[5]);
  });

  it("writes from the industry alone, so a shop's own listing never becomes its questions (BUG-130)", () => {
    const message = writeUserMessage({ industry: "Coffee shop", kind: "coffee shop", services: ["Coffee subscriptions", "Merchandise"], description: "Sells branded gear." });
    expect(message).toBe("Kind of business: coffee shop");
  });

  it("drops questions about hours, the time, near me, or two of the shop's services, and picks by service fit (BUG-130)", async () => {
    const written = [
      "Can I get books and breakfast tacos at the same place in {city}?",
      "Which bookstore in {city} is open late?",
      "Which bookstore in {city} is open on Sundays?",
      "Which bookstore in {city} is open now?",
      "Where is a good bookstore near me in {city}?",
      "Which bookstore in {city} has the best used books?",
      "What bookstore in {city} has the best reviews?",
      "Which bookstore in {city} is most recommended by locals?",
      "What is the best independent bookstore in {city}?",
      "Which bookstore in {city} has fair prices?",
      "Which bookstore in {city} offers the best value?",
      "Which bookstore in {city} has the best children's section?",
      "What is the most trusted bookstore in {city}?",
      "Which bookstore in {city} has the widest selection?",
    ].map((template, i) => ({ template, intent: (["best", "reviews", "price", "comparison"] as const)[i % 4] }));
    const { clients } = fakeQuestionClients({ write: written });
    const bookstore = { ...FLORIST_BUSINESS, city: "Austin", region: "TX", industry: "other", industryText: "Bookstore", services: ["Used books", "Breakfast tacos"] };
    const set = await prepareQuestions(bookstore, clients);
    const text = set.questions.map((q) => q.text);
    expect(set.questions).toHaveLength(QUESTION_COUNT);
    expect(text.filter((t) => /open|near me|tacos/.test(t))).toEqual([]);
    expect(text).toContain("Which bookstore in Austin, TX has the best used books?");
  });

  it("asks a few questions about the business's own area when it has one (BUG-131)", async () => {
    const { clients } = fakeQuestionClients({ write: [...FLORIST_WRITTEN] });
    const set = await prepareQuestions({ ...FLORIST_BUSINESS, city: "Austin", region: "TX", area: "East Austin" }, clients);
    const text = set.questions.map((q) => q.text);
    expect(text.filter((t) => t.includes("East Austin, TX"))).toHaveLength(AREA_QUESTIONS);
    expect(text.filter((t) => t.includes(" Austin, TX") && !t.includes("East Austin"))).toHaveLength(QUESTION_COUNT - AREA_QUESTIONS);
    expect(areaLabel("Hyde Park", "Austin", "TX")).toBe("Hyde Park, Austin, TX");
    expect(areaLabel("East Austin", "Austin", "TX")).toBe("East Austin, TX");
  });

  it("asks Claude again once before falling back", async () => {
    const { clients, calls } = fakeQuestionClients({ write: new Error("network down") });
    await prepareQuestions(FLORIST_BUSINESS, clients);
    expect(calls.write).toBe(2);
  });
});

describe("rules for reused questions (A8)", () => {
  it("spots a question built on two of the business's services at once", () => {
    const services = ["Books", "Book sales", "Signed books", "Coffee drinks", "Teas", "Breakfast tacos", "Vegan options", "Gluten-free options"];
    expect(mixesServices("Can I get books and breakfast tacos at the same place in Austin, TX?", services)).toBe(true);
    expect(mixesServices("Are there bookstores in Austin, TX with vegan or gluten-free food options?", services)).toBe(true);
    expect(mixesServices("Where's the best place to buy books and get tea in Austin, TX?", services)).toBe(true);
    expect(mixesServices("Where can I buy signed books in Austin, TX?", services)).toBe(false);
    expect(mixesServices("Which bookstore in Austin, TX has the best coffee?", services)).toBe(false);
    expect(mixesServices("What is the best bookstore in Austin, TX?", services)).toBe(false);
  });

  it("spots questions whose answer depends on when they are asked", () => {
    for (const q of ["Which bookstore in Austin, TX is open now?", "Is any bookstore in Austin, TX open tonight?", "Which bakery in Austin, TX has fresh bread today?", "Which bookstore in Austin, TX is open this weekend?"]) {
      expect(dependsOnTime(q)).toBe(true);
    }
    for (const q of ["Which bookstore in Austin, TX is open late?", "Which bookstore in Austin, TX is open on Sundays?", "Is any bookstore in Austin, TX open 24 hours?"]) {
      expect(dependsOnTime(q)).toBe(true);
    }
    for (const q of ["Which bookstore in Austin, TX has an open reading room?", "What do locals know about bookstores in Austin, TX?"]) {
      expect(dependsOnTime(q)).toBe(false);
    }
  });

  it("drops the old 'Who can do {service} today?' filler", () => {
    expect(asksForBusiness("Who can do coffee drinks in Austin, TX today?")).toBe(false);
    expect(asksForBusiness("Which bookstore in Austin, TX can order a book for me?")).toBe(true);
  });

  it("calls a question general only when it fits any business of the kind (A8)", () => {
    const general = (q: string, services: string[] = []) => isGeneralQuestion(q, "Bookstore", "Austin", "TX", services);
    expect(general("What is the best bookstore in Austin, TX?")).toBe(true);
    expect(general("Which bookstores in Austin, TX do locals recommend?")).toBe(true);
    expect(general("Which bookstore in Austin, TX has fair prices?")).toBe(true);
    expect(general("Where can I buy books and grab breakfast tacos in Austin, TX?")).toBe(false);
    expect(general("Which bookstore in Austin, TX has reasonably priced coffee and food?")).toBe(false);
    expect(general("Who can do coffee drinks in Austin, TX today?")).toBe(false);
    expect(general("Which bookstore in Austin, TX is open now?")).toBe(false);
    // The new business's own services are fair game.
    expect(general("Which bookstore in Austin, TX has the best coffee?", ["coffee bar"])).toBe(true);
  });
});

describe("the plain fallback questions (A8)", () => {
  it("pass the same rules as every other question", () => {
    for (const q of fallbackQuestions("bookstore", "Austin", "TX")) {
      expect(asksForBusiness(q.text), q.text).toBe(true);
      expect(dependsOnTime(q.text), q.text).toBe(false);
      expect(isGeneralQuestion(q.text, "bookstore", "Austin", "TX", []), q.text).toBe(true);
    }
  });
});
