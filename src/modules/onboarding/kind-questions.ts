// Questions about what the business sells and, for a chain, about chains (2026-10-14). They come from the kind of
// business (business-kind.ts) in generic words only, one product per question, never hours or the time asked, so
// every business of the kind can be judged on them (BUG-130 rules). Pure.
import type { Intent } from "@/modules/question-library";
import { isCoreProduct, needsSitDown, productOf, type BusinessKind } from "./business-kind";
import { QUESTION_COUNT } from "./prompts/pick-questions.v8";
import { balancePicks, type PreparedQuestion } from "./question-rules";

/** Of the 12 questions, at most this many ask about one product the business sells. */
export const MAX_PRODUCT_QUESTIONS = 4;

const PRODUCT_TEMPLATES: { make: (product: string, where: string) => string; intent: Intent }[] = [
  { make: (p, w) => `Where can I get the best ${p} in ${w}?`, intent: "best" },
  { make: (p, w) => `Which place in ${w} do locals recommend for ${p}?`, intent: "reviews" },
  { make: (p, w) => `Where can I find good, affordable ${p} in ${w}?`, intent: "price" },
  { make: (p, w) => `Which spot in ${w} has the best ${p}?`, intent: "best" },
];

// A side product with the kind of business in it: "Which coffee shop in Islamabad has the best sandwiches?"
const SIDE_TEMPLATES: { make: (product: string, where: string, noun: string) => string; intent: Intent }[] = [
  { make: (p, w, n) => `Which ${n} in ${w} has the best ${p}?`, intent: "best" },
  { make: (p, w, n) => `Which ${n} in ${w} do locals recommend for ${p}?`, intent: "reviews" },
  { make: (p, w, n) => `Which ${n} in ${w} has good, affordable ${p}?`, intent: "price" },
  { make: (p, w, n) => `Which ${n} in ${w} is known for its ${p}?`, intent: "best" },
];

const question = (text: string, intent: Intent): PreparedQuestion => ({ text, intent, templateId: null });

/**
 * Up to 4 questions, each about one generic product the business sells: "Where can I get the best fried chicken in
 * Islamabad?", and "What's the best fast food delivery in Islamabad?" for a fast food place that delivers.
 */
export function productQuestions(kind: BusinessKind, where: string): PreparedQuestion[] {
  const out: PreparedQuestion[] = [];
  if (kind.takeaway && kind.delivers) out.push(question(`What's the best fast food delivery in ${where}?`, "best"));
  // Each product once before any gets a second question, each with a different wording and intent.
  for (let pass = 0; pass < PRODUCT_TEMPLATES.length; pass++) {
    for (const [i, product] of kind.products.entries()) {
      if (out.length >= MAX_PRODUCT_QUESTIONS) return out;
      const at = (i + pass) % PRODUCT_TEMPLATES.length;
      if (isCoreProduct(kind, product)) out.push(question(PRODUCT_TEMPLATES[at].make(product, where), PRODUCT_TEMPLATES[at].intent));
      else out.push(question(SIDE_TEMPLATES[at].make(product, where, kind.noun), SIDE_TEMPLATES[at].intent));
    }
  }
  return out;
}

/** "fast food chains", "coffee chains", "bakery chains". */
function chainsOf(kind: BusinessKind): string {
  if (kind.takeaway) return "fast food chains";
  if (kind.noun === "coffee shop") return "coffee chains";
  return `${kind.noun} chains`;
}

/**
 * For a business with several locations, 2 or 3 questions customers ask about chains: "Which coffee chains are in
 * Islamabad?", "Which fast food chains in Islamabad are the most popular?", and one about its main product.
 */
export function chainQuestions(kind: BusinessKind, where: string): PreparedQuestion[] {
  if (!kind.chain) return [];
  const chains = chainsOf(kind);
  const out = [question(`Which ${chains} are in ${where}?`, "best"), question(`Which ${chains} in ${where} are the most popular?`, "reviews")];
  if (kind.products[0]) out.push(question(`Where can I get ${kind.products[0]} from a well-known chain in ${where}?`, "best"));
  return out;
}

/**
 * The set for this kind of business: sit-down questions out for a counter or takeaway place; chain questions for a
 * chain; product questions for products the set does not ask about yet, so at most 4 of the 12 are about a product.
 * The set's own picks keep their order and come first; the rest is topped up with plain questions, with the usual
 * intent mix (balancePicks). A business with no products and no chain, a plumber or a dentist, keeps its set.
 */
export function withKindQuestions(
  set: PreparedQuestion[],
  kind: BusinessKind,
  where: string,
  plain: PreparedQuestion[],
  services: string[],
): PreparedQuestion[] {
  const fits = (q: PreparedQuestion) => !(kind.takeaway && needsSitDown(q.text)) && !asksOnlyForSide(q, kind);
  const kept = set.filter(fits);
  const asked = new Set(kept.filter((q) => isProductQuestion(q, kind)).map((q) => productAsked(q.text, kind)));
  const deliveryAsked = kept.some((q) => /\bdeliver(y|ies|s)?\b/i.test(q.text));
  const products = productQuestions(kind, where).filter((q) => {
    const p = productOf(q.text);
    return p ? !asked.has(p) : !deliveryAsked;
  });
  const chains = chainQuestions(kind, where);
  const special = [...chains, ...products.slice(0, Math.max(0, MAX_PRODUCT_QUESTIONS - asked.size))];
  if (special.length === 0 && kept.length === set.length) return set;
  const entry = (q: PreparedQuestion) => ({ template: q.text, tags: [] as string[], intent: q.intent, q });
  const room = Math.max(0, QUESTION_COUNT - special.length);
  // At most 4 product questions in all, the written ones included: the writer, given "fast food restaurant (fried
  // chicken, burgers)", wrote 7 fried chicken questions for KFC and no general one (2026-10-14 live check).
  const chosen = capProducts([...special, ...kept.slice(0, room)], kind, new Set(chains));
  const general = [...kept.slice(room), ...plain].filter((q) => fits(q) && !isProductQuestion(q, kind));
  const pool = [...chosen, ...general].map(entry);
  const balanced = balancePicks(chosen.map(entry), pool, services).map((e) => e.q);
  // Keep the set's own order first, then what was added.
  const order = (q: PreparedQuestion) => (kept.includes(q) ? kept.indexOf(q) : QUESTION_COUNT + special.indexOf(q));
  return [...balanced].sort((x, y) => order(x) - order(y));
}

/**
 * The product a question asks about, with the kind of business itself left out first: "What is the best coffee shop
 * in Austin?" names a coffee shop, not coffee.
 */
function productAsked(text: string, kind: BusinessKind): string | null {
  const nouns = [kind.noun, "coffee shops?", "coffee chains?", "coffee houses?", "fast food (?:places?|restaurants?|chains?|joints?|spots?)"];
  const without = nouns.reduce((t, n) => t.replace(new RegExp(`\\b${n}\\b`, "gi"), " "), text);
  return productOf(without);
}

/**
 * A question about a product (any food or drink, not only the ones on the business's list: the writer asked KFC about
 * "chicken sandwiches" and "wings"), or about delivery for a place that delivers. Only for food and drink places.
 */
function isProductQuestion(q: PreparedQuestion, kind: BusinessKind): boolean {
  if (kind.products.length === 0 && !kind.takeaway) return false;
  return productAsked(q.text, kind) !== null || (kind.delivers && /\bdeliver(y|ies|s)?\b/i.test(q.text));
}

/**
 * A written question about a side product that does not say what kind of business: "Are there any cheap donut places
 * in Islamabad?" finds donut shops, not Tim Hortons (2026-10-14 live check). Ours name the kind (SIDE_TEMPLATES).
 */
function asksOnlyForSide(q: PreparedQuestion, kind: BusinessKind): boolean {
  const product = productAsked(q.text, kind);
  if (product === null || isCoreProduct(kind, product)) return false;
  const kindWords = kind.takeaway ? "fast food" : "coffee|caf(?:e|é)s?";
  return !new RegExp(`\\b(?:${kind.noun}|${kindWords})\\b`, "i").test(q.text);
}

/**
 * Drops product questions past MAX_PRODUCT_QUESTIONS, keeping the first ones. Only our own chain questions are left
 * out of the count: a written "Which fast food chain makes better chicken" is a product question like any other.
 */
function capProducts(list: PreparedQuestion[], kind: BusinessKind, chains: Set<PreparedQuestion>): PreparedQuestion[] {
  let products = 0;
  return list.filter((q) => {
    if (!isProductQuestion(q, kind) || chains.has(q)) return true;
    products += 1;
    return products <= MAX_PRODUCT_QUESTIONS;
  });
}
