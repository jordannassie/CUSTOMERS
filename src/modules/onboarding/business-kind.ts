// What kind of business the questions are for, finer than the industry list (2026-10-14). KFC is "restaurant" in
// the list, so it got "nice dinner with my partner" and "large group booking" questions, and no fast food chain was
// named in any of its 36 answers. The kind comes from Google's types (read live, never stored, D-73) and the
// business's own services, in generic words only: never a brand or menu name (Zinger, Timbits, Iced Capp). Pure.

// Google types for a place you order at the counter or take away.
const TAKEAWAY_TYPES = new Set(["fast_food_restaurant", "meal_takeaway", "hamburger_restaurant", "chicken_restaurant", "sandwich_shop"]);

// Generic products, longest first so "fried chicken" wins over "chicken". Shown as written in the second column.
const PRODUCTS: [string, string][] = [
  ["fried chicken", "fried chicken"],
  ["cold brew", "cold brew"],
  ["ice cream", "ice cream"],
  ["hot dog", "hot dogs"],
  ["burger", "burgers"],
  ["wing", "wings"],
  ["nugget", "chicken nuggets"],
  ["chicken", "chicken"],
  ["pizza", "pizza"],
  ["shawarma", "shawarma"],
  ["biryani", "biryani"],
  ["kebab", "kebabs"],
  ["sandwich", "sandwiches"],
  ["wrap", "wraps"],
  ["fries", "fries"],
  ["donut", "donuts"],
  ["doughnut", "donuts"],
  ["coffee", "coffee"],
  ["espresso", "espresso"],
  ["latte", "lattes"],
  ["cappuccino", "cappuccino"],
  ["tea", "tea"],
  ["pastry", "pastries"],
  ["pastries", "pastries"],
  ["croissant", "croissants"],
  ["bagel", "bagels"],
  ["cake", "cakes"],
  ["breakfast", "breakfast"],
  ["steak", "steak"],
  ["sushi", "sushi"],
  ["seafood", "seafood"],
  ["bbq", "barbecue"],
  ["barbecue", "barbecue"],
  ["taco", "tacos"],
  ["noodle", "noodles"],
];

// Products a fast food place sells: services mostly made of these make a restaurant a fast food one.
const FAST_FOOD = new Set(["fried chicken", "burgers", "wings", "chicken nuggets", "chicken", "pizza", "shawarma", "sandwiches", "wraps", "fries", "hot dogs"]);
// What a coffee shop is for: any of these alone makes a fair question it can win.
const COFFEE_DRINKS = new Set(["coffee", "espresso", "lattes", "cappuccino", "cold brew", "tea"]);

/**
 * True when customers asking for this product alone would be pointed to this kind of business: coffee for a coffee
 * shop, fried chicken for a fast food place. "Sandwiches" asked alone finds sandwich shops, not Tim Hortons, so a
 * side product is asked about with the kind of business in the question (2026-10-14 live check).
 */
export function isCoreProduct(kind: Pick<BusinessKind, "noun" | "takeaway">, product: string): boolean {
  if (kind.takeaway) return FAST_FOOD.has(product);
  if (kind.noun === "coffee shop") return COFFEE_DRINKS.has(product);
  return true;
}

const TAKEAWAY_SERVICE = /\b(delivery|deliveries|takeaway|take away|takeout|take out|drive[- ]?thru|drive[- ]?through)\b/i;

export type BusinessKind = {
  /** For the question prompts: "fast food restaurant (fried chicken, burgers)", "coffee shop chain (coffee, donuts)". */
  label: string;
  /** What customers call it: "fast food restaurant", "coffee shop". */
  noun: string;
  /** Generic products from its services, at most 3, for product questions. Empty outside food and drink. */
  products: string[];
  /** Ordered at a counter or taken away: sit-down questions (date night, group booking) never fit it. */
  takeaway: boolean;
  /** It delivers: "fast food delivery" fits it. */
  delivers: boolean;
  /** Several locations under one brand (auto-fill's chain check). */
  chain: boolean;
};

export type KindInput = {
  /** One of INDUSTRIES, or the user's own words for "other". */
  industry: string | null;
  /** The industry as customers say it: "coffee shop", "restaurant", "florist". */
  noun: string;
  services: string[];
  primaryType?: string | null;
  types?: string[];
  chain?: boolean;
};

const lower = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;

/** The generic product a service names, "Zinger burger" gives "burgers"; null for "Timbits" or "Iced Capp". */
export function productOf(service: string): string | null {
  const hay = lower(service);
  const hit = PRODUCTS.find(([word]) => new RegExp(` ${word}(e?s)? `).test(hay));
  return hit ? hit[1] : null;
}

export function businessKind(input: KindInput): BusinessKind {
  const food = input.industry === "restaurant" || input.industry === "coffee_shop";
  const products = food ? [...new Set(input.services.map(productOf).filter((p): p is string => p !== null))] : [];
  const delivers = food && input.services.some((s) => TAKEAWAY_SERVICE.test(s));
  const types = new Set([input.primaryType ?? "", ...(input.types ?? [])].filter(Boolean));
  const fastFoodProducts = products.filter((p) => FAST_FOOD.has(p)).length;
  const takeaway =
    input.industry === "restaurant" &&
    ([...types].some((t) => TAKEAWAY_TYPES.has(t)) || (fastFoodProducts >= 2 && fastFoodProducts >= products.length / 2));
  const chain = input.chain === true;
  const noun = takeaway ? "fast food restaurant" : input.noun;
  const shown = products.slice(0, 2);
  return {
    label: `${noun}${chain ? " chain" : ""}${shown.length ? ` (${shown.join(", ")})` : ""}`,
    noun,
    products: products.slice(0, 3),
    takeaway,
    delivers,
    chain,
  };
}

// Sit-down dining only: a counter or takeaway place can never be the answer.
const SIT_DOWN =
  /\b(date night|dinner date|romantic|anniversar(?:y|ies)|special occasions?|celebrat(?:e|ing|ion)|birthday dinner|nice dinner|large groups?|group (?:booking|dinner|reservations?)|book(?:ing)? a table|reservations?|reserve a table|fine dining|rooftop|upscale|ambian?ce|private (?:dining|room)|my partner|wine list)\b/i;

/** True for a question only a sit-down restaurant fits. */
export function needsSitDown(question: string): boolean {
  return SIT_DOWN.test(question);
}
