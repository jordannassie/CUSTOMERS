// Hand-built sources for tests and the fast eval. Made-up businesses on reserved .example domains;
// no real provider was called to make them. Google values here stand in for a live Places call.
import type { CheckRow, ExplainSources, Signals } from "./facts";

export const BEAN_HOUSE_ID = "0b6f6c2e-6f4e-4a57-9d0a-000000000001";
export const DAILY_GRIND_ID = "0b6f6c2e-6f4e-4a57-9d0a-000000000002";

const week = (open: string, closedOn: string[] = []) =>
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
    (day) => `${day}: ${closedOn.includes(day) ? "Closed" : open}`,
  );

export const COFFEE_SIGNALS = new Map<string, Signals | null>([
  ["ChIJ-fixture-sunrise-coffee", { rating: 4.2, reviewCount: 12, categories: ["Coffee shop"], hours: week("7:00 AM to 3:00 PM", ["Sunday"]) }],
  ["ChIJ-fixture-bean-house", { rating: 4.7, reviewCount: 320, categories: ["Coffee shop", "Bakery"], hours: week("6:00 AM to 8:00 PM") }],
  ["ChIJ-fixture-daily-grind", { rating: 4.5, reviewCount: 211, categories: ["Cafe"], hours: week("6:30 AM to 6:00 PM") }],
]);

/** Google numbers that must never reach Claude's input or the stored text. */
export const COFFEE_PLACES_NUMBERS = ["320", "211", "4.7", "4.5", "4.2"];

const QUESTIONS = ["Best coffee shop in Springfield, IL?", "Where can I get oat milk lattes in Springfield, IL?"];
const PROVIDERS = ["openai", "anthropic", "perplexity"];

function check(i: number, named: string[], cites: string[]): CheckRow {
  return {
    provider: PROVIDERS[i % 3],
    question: QUESTIONS[Math.floor(i / 3) % 2],
    businessMentioned: named.includes("Sunrise Coffee Bar"),
    competitorsMentioned: ["Bean House", "Daily Grind"].map((name) => ({ name, mentioned: named.includes(name), position: null })),
    citations: cites.map((url) => ({ url, title: null })),
  };
}

// 6 answers: Bean House in 5, Daily Grind in 3, you in 1; Yelp cited in 4 (3 without you).
export const COFFEE_CHECKS: CheckRow[] = [
  check(0, ["Bean House", "Daily Grind"], ["https://www.yelp.com/biz/bean-house"]),
  check(1, ["Bean House"], ["https://www.yelp.com/search?coffee"]),
  check(2, ["Bean House", "Sunrise Coffee Bar"], ["https://sunrise-coffee.example/about", "https://www.yelp.com/x"]),
  check(3, ["Bean House", "Daily Grind"], ["https://www.tripadvisor.com/coffee"]),
  check(4, ["Daily Grind"], ["https://www.yelp.com/y"]),
  check(5, ["Bean House"], []),
];

export const COFFEE_SOURCES: ExplainSources = {
  business: {
    name: "Sunrise Coffee Bar",
    city: "Springfield",
    region: "IL",
    industry: "coffee_shop",
    domain: "sunrise-coffee.example",
    hasWebsite: true,
    description: "A neighborhood cafe in Springfield that roasts its own beans.",
    services: ["espresso drinks", "pastries"],
    placesId: "ChIJ-fixture-sunrise-coffee",
  },
  competitors: [
    { id: DAILY_GRIND_ID, name: "Daily Grind", placesId: "ChIJ-fixture-daily-grind" },
    { id: BEAN_HOUSE_ID, name: "Bean House", placesId: "ChIJ-fixture-bean-house" },
  ],
  checks: COFFEE_CHECKS,
  alsoNamed: [{ name: "Copper Kettle", answers: 2 }],
  siteFacts: {
    promptVersion: "business-autofill.v1",
    model: "claude-haiku-4-5",
    domain: "sunrise-coffee.example",
    pages: [
      { path: "/", status: "ok" },
      { path: "/about", status: "ok" },
      { path: "/services", status: "missing" },
    ],
    facts: { phone: "", address: "120 Main St, Springfield, IL 62701", services: ["espresso drinks", "pastries"] },
  },
  signals: COFFEE_SIGNALS,
};

/** A business with no website and no Google place: nothing to fill, rules and template still work. */
export const PLUMBER_SOURCES: ExplainSources = {
  business: {
    name: "Nowhere Plumbing",
    city: "Springfield",
    region: null,
    industry: "plumber",
    domain: null,
    hasWebsite: false,
    description: null,
    services: [],
    placesId: null,
  },
  competitors: [{ id: BEAN_HOUSE_ID, name: "Fast Pipes", placesId: null }],
  checks: [0, 1, 2].map((i) => ({
    provider: PROVIDERS[i],
    question: "Emergency plumber in Springfield?",
    businessMentioned: false,
    competitorsMentioned: [{ name: "Fast Pipes", mentioned: i < 2 }],
    citations: [],
  })),
  alsoNamed: [],
  siteFacts: null,
  signals: new Map(),
};
