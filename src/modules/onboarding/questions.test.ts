import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { libraryFileSchema } from "@/modules/question-library";
import { pickRequest, writeRequest } from "./question-model";
import {
  COFFEE_BUSINESS,
  COFFEE_GOOD_PICK,
  COFFEE_LIBRARY,
  fakeQuestionClients,
  FLORIST_BUSINESS,
  FLORIST_WRITTEN,
} from "./question-fixtures";
import { balancePicks, fallbackQuestions, isUsableTemplate } from "./question-rules";
import { prepareQuestions } from "./questions";
import { MAX_PER_INTENT, PICK_MODEL, QUESTION_COUNT } from "./prompts/pick-questions.v1";

const intents = (qs: { intent: string }[]) => new Set(qs.map((q) => q.intent));
const maxPerIntent = (qs: { intent: string }[]) =>
  Math.max(...[...intents(qs)].map((i) => qs.filter((q) => q.intent === i).length));

describe("picking from the industry library", () => {
  it("keeps the coffee shop's own services (oat milk lattes, open early) and fills the city", async () => {
    const { clients, calls } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: COFFEE_GOOD_PICK });
    const set = await prepareQuestions(COFFEE_BUSINESS, clients);

    expect(calls).toEqual({ pick: 1, write: 0 });
    expect(set).toMatchObject({ source: "library", libraryCandidate: false, model: PICK_MODEL, error: null });
    expect(set.questions).toHaveLength(QUESTION_COUNT);
    const texts = set.questions.map((q) => q.text);
    expect(texts).toContain("Which coffee shop in Springfield, IL makes the best oat milk latte?");
    expect(texts).toContain("Which coffee shop in Springfield, IL is open early in the morning?");
    expect(texts.every((t) => t.includes("Springfield, IL") && !t.includes("{city}"))).toBe(true);
    expect(set.questions[0].templateId).toBe("coffee-2");
  });

  it("keeps a mix of intents even when the model picks one intent too often, and tops up to 12", async () => {
    const allBest = [1, 2, 3, 4, 5, 17, 18];
    const { clients } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: allBest });
    const set = await prepareQuestions(COFFEE_BUSINESS, clients);

    expect(set.source).toBe("library");
    expect(set.questions).toHaveLength(QUESTION_COUNT);
    expect(maxPerIntent(set.questions)).toBeLessThanOrEqual(MAX_PER_INTENT);
    expect(intents(set.questions).size).toBe(5);
  });

  it("ignores repeated and out-of-range numbers", async () => {
    const { clients } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: [2, 2, 99, 0, -1, ...COFFEE_GOOD_PICK] });
    const set = await prepareQuestions(COFFEE_BUSINESS, clients);
    const ids = set.questions.map((q) => q.templateId);
    expect(new Set(ids).size).toBe(QUESTION_COUNT);
    expect(ids.every((id) => id?.startsWith("coffee-"))).toBe(true);
  });

  it("uses a library of 12 or fewer as it is, without a model call (example fixture)", async () => {
    const example = libraryFileSchema.parse(JSON.parse(readFileSync("tests/fixtures/question-library.example.json", "utf8")));
    const dentist = example.templates
      .filter((t) => t.industry === "dentist")
      .map((t, i) => ({ id: `dentist-${i}`, template: t.template, tags: t.tags, intent: t.intent }));
    const { clients, calls } = fakeQuestionClients({ library: { dentist } });
    const set = await prepareQuestions({ ...COFFEE_BUSINESS, industry: "dentist", city: "Orange", region: "CA" }, clients);

    expect(calls.pick).toBe(0);
    expect(set).toMatchObject({ source: "library", model: null });
    expect(set.questions.map((q) => q.text)).toEqual([
      "Who is the best dentist in Orange, CA?",
      "Which dentist in Orange, CA offers emergency appointments?",
    ]);
  });
});

describe("industry not in the library", () => {
  it("has Claude write 12 questions, fills the city and flags the industry as a library candidate", async () => {
    const { clients, calls } = fakeQuestionClients({ write: [...FLORIST_WRITTEN] });
    const set = await prepareQuestions(FLORIST_BUSINESS, clients);

    expect(calls).toEqual({ pick: 0, write: 1 });
    expect(set).toMatchObject({ source: "written", libraryCandidate: true, model: PICK_MODEL });
    expect(set.questions).toHaveLength(QUESTION_COUNT);
    expect(set.questions.every((q) => q.text.includes("Orange, CA") && q.templateId === null)).toBe(true);
    expect(maxPerIntent(set.questions)).toBeLessThanOrEqual(MAX_PER_INTENT);
  });

  it("drops written questions that break the rules and tops up from the template engine", async () => {
    const broken = [
      ...FLORIST_WRITTEN.slice(0, 8),
      { template: "Who is the best florist near me?", intent: "best" as const },
      { template: "Best florist in {city} for {occasion}?", intent: "best" as const },
      { template: "Tell me about florists in {city}.", intent: "best" as const },
    ];
    const { clients } = fakeQuestionClients({ write: broken });
    const set = await prepareQuestions(FLORIST_BUSINESS, clients);

    expect(set.source).toBe("written");
    expect(set.questions).toHaveLength(QUESTION_COUNT);
    expect(set.questions.filter((q) => q.text.includes("near me") || q.text.includes("{"))).toEqual([]);
    expect(set.questions.every((q) => q.text.includes("Orange, CA"))).toBe(true);
  });

  it("writes questions when a known industry has no library loaded yet", async () => {
    const { clients, calls } = fakeQuestionClients({ write: [...FLORIST_WRITTEN] });
    const set = await prepareQuestions({ ...COFFEE_BUSINESS, industry: "plumber" }, clients);
    expect(calls.write).toBe(1);
    expect(set).toMatchObject({ source: "written", libraryCandidate: true });
  });
});

describe("fallback to the old template engine", () => {
  it("is used when the pick call fails, still with 12 city questions and a mix of intents", async () => {
    const { clients } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: new Error("529 overloaded") });
    const set = await prepareQuestions(COFFEE_BUSINESS, clients);

    expect(set).toMatchObject({ source: "fallback", libraryCandidate: false, model: null, error: "529 overloaded" });
    expect(set.questions).toHaveLength(QUESTION_COUNT);
    expect(set.questions.every((q) => q.text.includes("Springfield, IL") && q.templateId === null)).toBe(true);
    expect(set.questions[0].text).toBe("What is the best coffee shop in Springfield, IL?");
    expect(maxPerIntent(set.questions)).toBeLessThanOrEqual(MAX_PER_INTENT);
  });

  it("is used when the write call fails, and the industry is still a library candidate", async () => {
    const { clients } = fakeQuestionClients({ write: new Error("network down") });
    const set = await prepareQuestions(FLORIST_BUSINESS, clients);
    expect(set).toMatchObject({ source: "fallback", libraryCandidate: true, error: "network down" });
    expect(set.questions[0].text).toBe("What is the best florist in Orange, CA?");
  });

  it("is used when the model ignores the list", async () => {
    const { clients } = fakeQuestionClients({ library: { coffee_shop: COFFEE_LIBRARY }, pick: [1, 2, 40, 41] });
    const set = await prepareQuestions(COFFEE_BUSINESS, clients);
    expect(set.source).toBe("fallback");
  });

  it("is not used for a database failure, which the caller must see", async () => {
    const { clients } = fakeQuestionClients();
    clients.loadLibrary = async () => {
      throw new Error("db down");
    };
    await expect(prepareQuestions(COFFEE_BUSINESS, clients)).rejects.toThrow("db down");
  });

  it("gives 12 questions for every industry label", () => {
    for (const label of ["Dentist", "Coffee shop", "Florist"]) {
      const qs = fallbackQuestions(label, "Austin", null);
      expect(qs).toHaveLength(QUESTION_COUNT);
      expect(qs.every((q) => q.text.includes("Austin"))).toBe(true);
    }
  });
});

describe("rules", () => {
  it("accepts only questions with exactly one {city} and no other placeholder", () => {
    expect(isUsableTemplate("Who is the best florist in {city}?")).toBe(true);
    expect(isUsableTemplate("Who is the best florist near me?")).toBe(false);
    expect(isUsableTemplate("Florists in {city} or {city}?")).toBe(false);
    expect(isUsableTemplate("Best {service} in {city}?")).toBe(false);
    expect(isUsableTemplate("Best florist in {city}.")).toBe(false);
  });

  it("stops short rather than break the intent cap when the pool runs out", () => {
    // The first five fixture templates are all "best".
    expect(balancePicks([], COFFEE_LIBRARY.slice(0, 5), [])).toHaveLength(MAX_PER_INTENT);
  });

  it("refuses a business without a city", async () => {
    const { clients } = fakeQuestionClients();
    await expect(prepareQuestions({ ...COFFEE_BUSINESS, city: " " }, clients)).rejects.toThrow(/city/);
  });

  it("never sends the business name, and pins the model", () => {
    const business = { industry: "Coffee shop", services: ["oat milk lattes"], description: "Opens at 6am." };
    const pick = pickRequest({ business, templates: [{ number: 1, template: "Best cafe in {city}?", tags: ["general"], intent: "best" }] });
    const write = writeRequest({ business });
    expect(pick.model).toBe("claude-haiku-4-5");
    expect(write.model).toBe("claude-haiku-4-5");
    expect(pick.messages[0].content).toContain("oat milk lattes");
    expect(pick.messages[0].content).toContain("1. Best cafe in {city}? [intent: best; tags: general]");
  });
});
