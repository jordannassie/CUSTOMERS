// Pure rules for question picking (MVP_SPEC 5.3): check what the model returned, keep the intent mix,
// fill the city, and plain questions that fit any business as the last fallback.
import { placeLabel } from "@/lib/place-label";
import type { Intent } from "@/modules/question-library";
import { MAX_PER_INTENT, QUESTION_COUNT } from "./prompts/pick-questions.v3";

export type LibraryEntry = { id: string; template: string; tags: string[]; intent: Intent };

export type PreparedQuestion = {
  text: string;
  intent: Intent;
  /** question_library row the question came from; null when written by the model or the fallback. */
  templateId: string | null;
};

const CITY = "{city}";

export function cityLabel(city: string, region: string | null): string {
  return placeLabel(city, region);
}

export function fillCity(template: string, city: string): string {
  return template.replace(CITY, city).replace(/\s+/g, " ").trim();
}

/** Same rules as the library (question-library/validate.ts): one {city}, no other placeholder, a question. */
export function isUsableTemplate(template: string): boolean {
  const t = template.trim();
  if (t.split(CITY).length !== 2) return false;
  if ((t.match(/\{[^}]*\}/g) ?? []).some((p) => p !== CITY)) return false;
  return t.endsWith("?") && t.length <= 200;
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);

/** How many of the business's service words a template's tags or text mention; breaks top-up ties. */
export function serviceFit(entry: Pick<LibraryEntry, "template" | "tags">, services: string[]): number {
  const have = words(`${entry.tags.join(" ")} ${entry.template}`);
  return services.reduce((n, s) => n + [...words(s)].filter((w) => w.length > 2 && have.has(w)).length, 0);
}

/**
 * Keeps the model's choices in its order, drops repeats and anything past MAX_PER_INTENT, then tops up
 * to QUESTION_COUNT preferring intents still missing and templates closest to the services.
 */
export function balancePicks<T extends Pick<LibraryEntry, "template" | "tags" | "intent">>(
  chosen: T[],
  pool: T[],
  services: string[],
): T[] {
  const picked: T[] = [];
  const perIntent = new Map<Intent, number>();
  const seen = new Set<string>();
  const add = (t: T) => {
    const key = t.template.trim().toLowerCase();
    if (seen.has(key) || (perIntent.get(t.intent) ?? 0) >= MAX_PER_INTENT || picked.length >= QUESTION_COUNT) return;
    seen.add(key);
    perIntent.set(t.intent, (perIntent.get(t.intent) ?? 0) + 1);
    picked.push(t);
  };
  chosen.forEach(add);
  let rest = pool.filter((t) => !seen.has(t.template.trim().toLowerCase()));
  while (picked.length < QUESTION_COUNT) {
    rest = rest.filter((t) => !seen.has(t.template.trim().toLowerCase()) && (perIntent.get(t.intent) ?? 0) < MAX_PER_INTENT);
    if (!rest.length) break;
    const count = (t: T) => perIntent.get(t.intent) ?? 0;
    add(rest.reduce((best, t) => (count(t) < count(best) || (count(t) === count(best) && serviceFit(t, services) > serviceFit(best, services)) ? t : best)));
  }
  return picked;
}

// Plain questions that read right for any business, a shop or a restaurant as much as a trade (BUG-084). The
// old template engine asked about "same-day or emergency service" and what a "clothing store typically costs".
const FALLBACK: { template: string; intent: Intent }[] = [
  { template: "What is the best {industry} in {city}?", intent: "best" },
  { template: "Can you recommend a good {industry} in {city}?", intent: "best" },
  { template: "Which {industry} in {city} do locals recommend?", intent: "best" },
  { template: "I'm looking for a good {industry} in {city}. Which one should I choose?", intent: "best" },
  { template: "Which {industry} in {city} has the best reviews?", intent: "reviews" },
  { template: "What is the most trusted {industry} in {city}?", intent: "reviews" },
  { template: "What is the most popular {industry} in {city}?", intent: "reviews" },
  { template: "Which {industry} in {city} offers the best value?", intent: "comparison" },
  { template: "Which of the top {industry} options in {city} compares best?", intent: "comparison" },
  { template: "Which {industry} in {city} has fair prices?", intent: "price" },
  { template: "What is an affordable {industry} in {city}?", intent: "price" },
  { template: "Which {industry} in {city} is the most highly rated?", intent: "reviews" },
];

/** "Coffee shop" reads as "coffee shop" mid-sentence; "HVAC contractor" keeps its capitals. */
function midSentence(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(" ");
}

/** Used when Claude fails, and to fill a short written list: plain questions that read right for any business. */
export function fallbackQuestions(industry: string, city: string, region: string | null): PreparedQuestion[] {
  const where = cityLabel(city, region);
  const noun = midSentence(industry) || "local business";
  return FALLBACK.map((q) => ({ text: fillCity(q.template.replace("{industry}", noun), where), intent: q.intent, templateId: null }));
}

// Advice questions ("How much does drain cleaning typically cost?", "Should I get a camera inspection or start
// repairs?") rarely name a business, so a mention rate over them says little (BUG-116).
const ADVICE = [
  /^\s*how (?:much|long|often|do|does|can|to)\b/i,
  /^\s*why\b/i,
  /\bshould i\b[^?]*\bor\b/i,
  /\bwhat'?s better\b|\bwhat is better\b/i,
  /\bdifference between\b|\bwhat'?s the difference\b/i,
  /\btypically cost\b|\bhow much\b/i,
  /\bis it worth\b|\bdo i need\b/i,
  /\b(?:tips|advice) (?:for|on)\b|\bwhat should i (?:look for|know|ask)\b/i,
  /\b(?:benefits|pros and cons|advantages) of\b/i,
];

// The old "Who can do {service} in {city} today?" filler: it reads like a job listing, not a customer's question.
const SERVICE_FILLER = /^\s*who can (?:do|handle|help with)\b/i;

/** True for a question a customer asks to find a business, which AI answers by naming some. */
export function asksForBusiness(question: string): boolean {
  return !ADVICE.some((re) => re.test(question)) && !SERVICE_FILLER.test(question);
}

// "Open now" asked at 02:00 gets a different answer than at noon, so the score would move with the clock (A8).
const TIME_BOUND = /\b(?:now|today|tonight|currently|at the moment|this (?:morning|afternoon|evening|weekend|week))\b/i;
// Hours are each business's own: "open late" asked for a shop that closes at 4 PM can never name it (BUG-130).
const HOURS =
  /\bopen (?:late|early|all night|24|around the clock|(?:on |until |till |past )?(?:mon|tues|wednes|thurs|fri|satur|sun)days?|(?:on )?weekends?|until|till|past)\b|\b24\/7\b|\b24 hours\b|\blate[- ]night\b|\bopening hours\b/i;

/** True for a question whose answer depends on when it is asked, or on one business's opening hours. */
export function dependsOnTime(question: string): boolean {
  return TIME_BOUND.test(question) || HOURS.test(question);
}

/**
 * A question every business of the kind can be judged on: asks for a business, not advice; not tied to the time or
 * to opening hours; and no "near me", since the AI only knows the city.
 */
export function isFairQuestion(question: string): boolean {
  return asksForBusiness(question) && !dependsOnTime(question) && !/\bnear me\b/i.test(question);
}

// Words that carry no detail about what one business sells or offers: a question made only of these (plus the
// industry, the city and the new business's own services) fits every business of the kind (A8).
const PLAIN_WORDS = new Set(
  `a an the in on at of for to and or is are be it its this that these those with without from by as near around
  what which who where whom whose when how do does can could would should will i me my we you your our us they them their
  looking need want find get got have has had like some any good great best better top most more really very
  recommend recommended recommendation suggest suggested suggestions choose choice option options pick
  trusted trust popular favorite favourite well rated reviewed reviews review ratings rating locals local people
  affordable cheap cheaper cheapest price prices priced pricing value fair reasonable reasonably worth deals deal
  right nearby close closest nearest
  compare compared comparison difference between choosing one another other others place places spot spots shop shops
  store stores business businesses company companies near me area town city downtown neighborhood neighbourhood
  reliable quality highly experienced known independent offer offers offering top leading rated rank ranked ranks`.split(/\s+/),
);

const stem = (w: string) => w.replace(/ies$/, "y").replace(/s$/, "");

/**
 * True for a question built on two of the business's services at once ("books and breakfast tacos", "vegan or
 * gluten-free options"): only a shop with that exact mix fits it, so it scores the business against itself (A8).
 */
export function mixesServices(question: string, services: string[]): boolean {
  const asked = new Set([...words(question)].map(stem));
  // Services that share a matched word count once: "signed books" touches "Book sales" and "Signed books" alike.
  const groups: Set<string>[] = [];
  for (const s of services) {
    const hit = new Set([...words(s)].filter((w) => w.length > 2 && !PLAIN_WORDS.has(w)).map(stem).filter((w) => asked.has(w)));
    if (hit.size === 0) continue;
    const joined = groups.filter((g) => [...hit].some((w) => g.has(w)));
    const merged = new Set([...hit, ...joined.flatMap((g) => [...g])]);
    groups.splice(0, groups.length, ...groups.filter((g) => !joined.includes(g)), merged);
  }
  return groups.length >= 2;
}

/**
 * True for a question that would fit any business of this kind in this city: advice and filler are out, and so is
 * anything about a detail only the business it was written for has ("buy books and grab breakfast tacos"). A word
 * the new business lists among its own services still counts as general (A8).
 */
export function isGeneralQuestion(question: string, kind: string, city: string, region: string | null, services: string[]): boolean {
  if (!isFairQuestion(question)) return false;
  const known = new Set([kind, city, region ?? "", ...services].flatMap((s) => [...words(s)]).map(stem));
  return [...words(question)].every((w) => w.length < 3 || PLAIN_WORDS.has(w) || known.has(stem(w)) || PLAIN_WORDS.has(stem(w)));
}
