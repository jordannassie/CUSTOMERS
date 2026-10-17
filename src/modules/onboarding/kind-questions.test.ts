import { describe, expect, it } from "vitest";
import { businessKind, needsSitDown, productOf } from "./business-kind";
import { fakeQuestionClients } from "./question-fixtures";
import { fitsBusiness, isFairQuestion } from "./question-rules";
import { prepareQuestions, type QuestionBusiness } from "./questions";
import { productQuestions, withKindQuestions } from "./kind-questions";

// 2026-10-14 retest: KFC (restaurant) got "nice dinner with my partner" and "large group booking" questions and no
// question about fried chicken, burgers, fast food or delivery.
const KFC: QuestionBusiness = {
  industry: "restaurant",
  services: ["Fried chicken", "Zinger burgers", "Hot wings", "Home delivery"],
  description: "Fried chicken and burgers, dine in, takeaway and delivery.",
  city: "Islamabad",
  region: "Islamabad Capital Territory",
  name: "KFC",
  domain: "kfcpakistan.com",
};
const TIMS: QuestionBusiness = {
  industry: "coffee_shop",
  services: ["Coffee", "Donuts", "Timbits", "Iced Capp"],
  description: "Coffee and donuts.",
  city: "Islamabad",
  region: null,
  name: "Tim Hortons",
};
// What a model given only "Restaurant" wrote for KFC.
const SIT_DOWN_WRITTEN = [
  { template: "Which restaurant in {city} is perfect for a nice dinner with my partner?", intent: "best" as const },
  { template: "Where should I go in {city} for a special occasion dinner?", intent: "best" as const },
  { template: "Which restaurant in {city} takes large group bookings?", intent: "comparison" as const },
  { template: "Which restaurant in {city} has the best grilled meats?", intent: "best" as const },
  { template: "What is the best restaurant in {city}?", intent: "best" as const },
  { template: "Which restaurant in {city} has the best reviews?", intent: "reviews" as const },
  { template: "What is an affordable restaurant in {city}?", intent: "price" as const },
  { template: "Which restaurant in {city} do locals recommend?", intent: "reviews" as const },
  { template: "Which restaurant in {city} offers the best value?", intent: "price" as const },
  { template: "Which restaurant in {city} is best for a quick meal?", intent: "comparison" as const },
  { template: "What is the most popular restaurant in {city}?", intent: "reviews" as const },
  { template: "Which restaurant in {city} is the most highly rated?", intent: "reviews" as const },
];
const FAST_FOOD_TOPIC = /fried chicken|burger|fast food|deliver|wings/i;
const SIT_DOWN_TOPIC = /date night|partner|special occasion|group booking|large group|reservation|fine dining|rooftop/i;

describe("the kind of business", () => {
  it("reads a fast food place from its services or Google's type, in generic words only", () => {
    expect(businessKind({ industry: "restaurant", noun: "restaurant", services: KFC.services })).toMatchObject({
      label: "fast food restaurant (fried chicken, burgers)",
      takeaway: true,
      delivers: true,
      products: ["fried chicken", "burgers", "wings"],
    });
    expect(businessKind({ industry: "restaurant", noun: "restaurant", services: ["Pasta"], primaryType: "fast_food_restaurant" }).takeaway).toBe(true);
    expect(businessKind({ industry: "restaurant", noun: "restaurant", services: ["Steak", "Wine list", "Fine dining"] }).takeaway).toBe(false);
    // Menu and brand names never become a product.
    expect([productOf("Zinger burger"), productOf("Timbits"), productOf("Iced Capp")]).toEqual(["burgers", null, null]);
    expect(businessKind({ industry: "coffee_shop", noun: "coffee shop", services: TIMS.services }).label).toBe("coffee shop (coffee, donuts)");
    expect(businessKind({ industry: "plumber", noun: "plumber", services: ["Drain cleaning"] })).toMatchObject({ products: [], takeaway: false, label: "plumber" });
  });

  it("drops sit-down library templates for a takeaway place only", () => {
    // A restaurant that lists date nights fits the template; the same listing on a takeaway place never does.
    const ctx = { kind: "restaurant", city: "Islamabad", region: null, services: ["Date night dinners"], description: "" };
    const date = { template: "Which restaurant in {city} is best for date night?", tags: ["date night"] };
    expect(fitsBusiness(date, ctx)).toBe(true);
    expect(fitsBusiness(date, { ...ctx, takeaway: true })).toBe(false);
    expect(needsSitDown("Which spot in Islamabad has the best fried chicken?")).toBe(false);
  });
});

describe("questions that fit the kind of business", () => {
  it("gives a KFC-like business 3 or more fried chicken, burger, fast food or delivery questions and no sit-down ones", async () => {
    const seen: string[] = [];
    const { clients } = fakeQuestionClients({ write: SIT_DOWN_WRITTEN });
    const write = clients.model.write;
    clients.model.write = async (args) => (seen.push(args.business.kind), write(args));
    const texts = (await prepareQuestions(KFC, clients)).questions.map((q) => q.text);

    expect(seen).toEqual(["fast food restaurant (fried chicken, burgers)"]);
    expect(texts).toHaveLength(12);
    expect(texts.filter((t) => FAST_FOOD_TOPIC.test(t)).length).toBeGreaterThanOrEqual(3);
    expect(texts.filter((t) => SIT_DOWN_TOPIC.test(t))).toEqual([]);
    expect(texts.every(isFairQuestion)).toBe(true);
    expect(texts.some((t) => /zinger|kfc/i.test(t))).toBe(false);
  });

  it("asks about a product in at most 4 of the 12, even when the writer writes nothing else", async () => {
    // The live writer, told "fast food restaurant (fried chicken, burgers)", wrote mostly fried chicken questions.
    const allChicken = [
      "Which fast food place has the best crispy fried chicken in {city}?",
      "What's the most affordable fried chicken spot in {city}?",
      "Who serves the quickest fried chicken in {city}?",
      "Can you recommend a cheap fried chicken place in {city}?",
      "Where do people get fried chicken for a quick meal in {city}?",
      "Which burger joint in {city} should I try?",
      "I'm new to {city} and looking for decent burgers, any recommendations?",
      "Where can I find good wings in {city}?",
      "What is the best fast food restaurant in {city}?",
      "Which fast food restaurant in {city} has the best reviews?",
    ].map((template, i) => ({ template, intent: (["best", "price", "reviews", "comparison"] as const)[i % 4] }));
    const texts = (await prepareQuestions(KFC, fakeQuestionClients({ write: allChicken }).clients)).questions.map((q) => q.text);
    expect(texts).toHaveLength(12);
    expect(texts.filter((t) => /fried chicken|burger|wings|deliver/i.test(t)).length).toBeLessThanOrEqual(4);
    expect(texts.filter((t) => /fried chicken|burger|wings|deliver/i.test(t)).length).toBeGreaterThanOrEqual(3);
  });

  it("keeps a Tim Hortons-like business on coffee shop questions, with coffee and donut ones", async () => {
    const coffee = [
      "What is the best coffee shop in {city}?",
      "Which cafe in {city} do locals recommend?",
      "Which coffee shop in {city} has the best reviews?",
      "What is an affordable coffee shop in {city}?",
      "Which coffee shop in {city} has the best espresso?",
      "Which cafe in {city} is the most popular?",
      "Which coffee shop in {city} offers the best value?",
      "What is the most trusted coffee shop in {city}?",
      "Which coffee shop in {city} is best for a quick coffee?",
      "Which cafe in {city} has fair prices?",
      "Which coffee shop in {city} is the most highly rated?",
      "Can you recommend a good coffee shop in {city}?",
    ].map((template, i) => ({ template, intent: (["best", "reviews", "price", "comparison"] as const)[i % 4] }));
    const { clients } = fakeQuestionClients({ write: coffee });
    const texts = (await prepareQuestions(TIMS, clients)).questions.map((q) => q.text);
    expect(texts).toHaveLength(12);
    expect(texts.filter((t) => /restaurant|dinner|lunch|burger|chicken/i.test(t))).toEqual([]);
    expect(texts.some((t) => /\bdonuts\b/.test(t))).toBe(true);
    expect(texts.some((t) => /timbits|iced capp/i.test(t))).toBe(false);
  });

  it("leaves a plumber's and a dentist's set as it was", () => {
    const set = [{ text: "Who is the best plumber in Austin, TX?", intent: "best" as const, templateId: null }];
    for (const [industry, services] of [["plumber", ["Drain cleaning", "Water heaters"]], ["dentist", ["Cleanings", "Implants"]]] as const) {
      const kind = businessKind({ industry, noun: industry, services: [...services] });
      expect(withKindQuestions(set, kind, "Austin, TX", [], [...services])).toBe(set);
    }
  });
});

describe("chain questions (step 2)", () => {
  const coffeeWritten = [
    "What is the best coffee shop in {city}?",
    "Which cafe in {city} do locals recommend?",
    "Which coffee shop in {city} has the best reviews?",
    "What is an affordable coffee shop in {city}?",
    "Which cafe in {city} is the most popular?",
    "Which coffee shop in {city} offers the best value?",
    "What is the most trusted coffee shop in {city}?",
    "Which cafe in {city} has fair prices?",
    "Which coffee shop in {city} is the most highly rated?",
    "Can you recommend a good coffee shop in {city}?",
    "Which coffee shop in {city} is best for a quick coffee?",
    "Which cafe in {city} has the friendliest staff?",
  ].map((template, i) => ({ template, intent: (["best", "reviews", "price", "comparison"] as const)[i % 4] }));
  const chainOnes = (texts: string[]) => texts.filter((t) => /\bchains?\b/.test(t));

  it("gives a chain 2 or 3 chain questions, and a single location none", async () => {
    const chain = (await prepareQuestions({ ...TIMS, chain: true }, fakeQuestionClients({ write: coffeeWritten }).clients)).questions.map((q) => q.text);
    const single = (await prepareQuestions(TIMS, fakeQuestionClients({ write: coffeeWritten }).clients)).questions.map((q) => q.text);
    expect(chain).toHaveLength(12);
    expect(chainOnes(chain).length).toBeGreaterThanOrEqual(2);
    expect(chainOnes(chain).length).toBeLessThanOrEqual(3);
    expect(chain).toContain("Which coffee chains are in Islamabad?");
    expect(chainOnes(single)).toEqual([]);
  });

  it("asks a fast food chain about fast food chains", async () => {
    const texts = (await prepareQuestions({ ...KFC, chain: true }, fakeQuestionClients({ write: SIT_DOWN_WRITTEN }).clients)).questions.map((q) => q.text);
    expect(texts.some((t) => /fast food chains/.test(t))).toBe(true);
    expect(texts.every(isFairQuestion)).toBe(true);
    expect(texts.filter((t) => SIT_DOWN_TOPIC.test(t))).toEqual([]);
  });

  it("counts any food product toward the 4, and a written question that says 'chain' too (2026-10-14 live KFC set)", async () => {
    // What the live writer gave KFC in Islamabad: 7 of 12 about chicken or wings, 2 of them dodging the cap by
    // saying "chain".
    const live = [
      "What's the best fast food place for fried chicken in {city}?",
      "Can I get good quality fried chicken quickly in {city}?",
      "Which fast food chain has the most affordable chicken sandwiches in {city}?",
      "Is there a fast food restaurant with highly rated chicken in {city}?",
      "Which fast food chain makes better chicken, comparing their options in {city}?",
      "Where can I find good, affordable wings in {city}?",
      "Which of the top fast food restaurant options in {city} compares best?",
      "What is the most trusted fast food restaurant in {city}?",
      "Which fast food restaurant in {city} has the best reviews?",
      "What is an affordable fast food restaurant in {city}?",
    ].map((template, i) => ({ template, intent: (["best", "price", "reviews", "comparison"] as const)[i % 4] }));
    const texts = (await prepareQuestions({ ...KFC, chain: true }, fakeQuestionClients({ write: live }).clients)).questions.map((q) => q.text);
    const ours = new Set(["Which fast food chains are in Islamabad?", "Which fast food chains in Islamabad are the most popular?", "Where can I get fried chicken from a well-known chain in Islamabad?"]);
    const product = texts.filter((t) => !ours.has(t) && /chicken|burger|wings|sandwich|deliver/i.test(t));
    expect(texts).toHaveLength(12);
    expect(product.length).toBeLessThanOrEqual(4);
    expect(product.length).toBeGreaterThanOrEqual(3);
    expect(texts.filter((t) => ours.has(t)).length).toBeGreaterThanOrEqual(2);
    expect(texts.every(isFairQuestion)).toBe(true);
  });

  it("puts the kind of business in a question about a side product (2026-10-14 live Tim Hortons set)", () => {
    const tims = businessKind({ industry: "coffee_shop", noun: "coffee shop", services: ["Coffee", "Donuts", "Sandwiches"] });
    const texts = productQuestions(tims, "Islamabad").map((q) => q.text);
    expect(texts).toContain("Where can I get the best coffee in Islamabad?");
    expect(texts.filter((t) => /donuts|sandwiches/.test(t)).every((t) => t.includes("coffee shop"))).toBe(true);
    expect(texts.every(isFairQuestion)).toBe(true);
    // A fast food place's own products are asked plainly.
    const kfc = businessKind({ industry: "restaurant", noun: "restaurant", services: KFC.services, primaryType: "fast_food_restaurant" });
    expect(productQuestions(kfc, "Islamabad").map((q) => q.text)).toContain("Where can I get the best fried chicken in Islamabad?");
  });

  it("drops a written question about a side product that does not say coffee shop (2026-10-14 live Tim Hortons set)", async () => {
    const written = [
      "Are there any cheap donut places in {city}?",
      "Where can I find good sandwiches in {city}?",
      "Which coffee shop in {city} has the best donuts?",
      "Where should I go for the best coffee in {city}?",
      "Which coffee shop in {city} has the best reviews?",
      "What is the most trusted coffee shop in {city}?",
      "Which coffee shop in {city} offers the best value?",
      "What's a good coffee shop to visit in {city}?",
      "Which coffee shop in {city} do locals recommend?",
      "What's the cheapest coffee shop in {city}?",
      "Which of the top coffee shop options in {city} compares best?",
      "Can you recommend a trusted coffee shop in {city}?",
    ].map((template, i) => ({ template, intent: (["best", "price", "reviews", "comparison"] as const)[i % 4] }));
    const texts = (await prepareQuestions({ ...TIMS, services: ["Coffee", "Donuts", "Sandwiches"] }, fakeQuestionClients({ write: written }).clients)).questions.map((q) => q.text);
    expect(texts).toHaveLength(12);
    expect(texts).not.toContain("Are there any cheap donut places in Islamabad?");
    expect(texts).not.toContain("Where can I find good sandwiches in Islamabad?");
    expect(texts.some((t) => /coffee shop.*donuts/.test(t))).toBe(true);
    expect(texts.filter((t) => /donut|sandwich/i.test(t)).every((t) => /coffee shop/.test(t))).toBe(true);
  });
});
