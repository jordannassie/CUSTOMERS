// Pure rules for question picking (MVP_SPEC 5.3): check what the model returned, keep the intent mix,
// fill the city, and plain questions that fit any business as the last fallback.
import { needsSitDown } from "./business-kind";
export { fallbackQuestions } from "./plain-questions";
import { questionProblem } from "./question-fair";
export { asksForBusiness, dependsOnTime, hasPlaceholder, isFairQuestion, questionProblem, type QuestionProblem } from "./question-fair";
import { openingCount, questionKey } from "./question-style";
import type { LibraryIndustry } from "@/lib/industries";
import { placeLabel } from "@/lib/place-label";
import { offersTerm, specificTermsIn, type Intent } from "@/modules/question-library";
import { MAX_PER_INTENT, QUESTION_COUNT } from "./prompts/pick-questions.v8";

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
  // Every {city}: a template that slipped through with two must never show the placeholder.
  return template.replaceAll(CITY, city).replace(/\s+/g, " ").trim();
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
 * Keeps the model's choices in its order, drops repeats (also the same question worded another way) and anything
 * past MAX_PER_INTENT, then tops up to QUESTION_COUNT preferring intents still missing and templates closest to the
 * services.
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
    const key = questionKey(t.template);
    if (seen.has(key) || (perIntent.get(t.intent) ?? 0) >= MAX_PER_INTENT || picked.length >= QUESTION_COUNT) return;
    seen.add(key);
    perIntent.set(t.intent, (perIntent.get(t.intent) ?? 0) + 1);
    picked.push(t);
  };
  chosen.forEach(add);
  let rest = pool.filter((t) => !seen.has(questionKey(t.template)));
  while (picked.length < QUESTION_COUNT) {
    rest = rest.filter((t) => !seen.has(questionKey(t.template)) && (perIntent.get(t.intent) ?? 0) < MAX_PER_INTENT);
    if (!rest.length) break;
    const count = (t: T) => perIntent.get(t.intent) ?? 0;
    // Missing intents first, then openings not used yet (a set of twelve "Where can I find..." reads like a form),
    // then the closest fit to the services.
    const opening = (t: T) => openingCount(picked, t.template);
    const better = (t: T, best: T) =>
      count(t) !== count(best) ? count(t) < count(best) : opening(t) !== opening(best) ? opening(t) < opening(best) : serviceFit(t, services) > serviceFit(best, services);
    add(rest.reduce((best, t) => (better(t, best) ? t : best)));
  }
  return picked;
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
  reliable quality highly experienced known independent offer offers offering top leading rated rank ranked ranks
  overall stand stands out rest`.split(/\s+/),
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
  if (questionProblem(question, [city, region ?? ""]) !== null) return false;
  const known = new Set([kind, city, region ?? "", ...services].flatMap((s) => [...words(s)]).map(stem));
  return [...words(question)].every((w) => w.length < 3 || PLAIN_WORDS.has(w) || known.has(stem(w)) || PLAIN_WORDS.has(stem(w)));
}

/**
 * True when a question names a cuisine, product or service ("pasta", "seafood", "cold brew") the business does not
 * list among its services or in its description. Written questions are checked too: a fried chicken restaurant's
 * top-up once asked about pasta and seafood.
 */
export function namesUnofferedTerm(question: string, services: string[], description: string): boolean {
  const offered = `${services.join(" ; ")} ; ${description}`;
  return specificTermsIn(question).some((term) => !offersTerm(term, offered));
}

// Other words for the kind of business itself. They name the business, not something it offers, so "cafe" in a
// coffee shop's description never makes "Which cafe is best for a first date?" fit it.
export const KIND_WORDS: Record<LibraryIndustry, string> = {
  dentist: "dental dentistry clinic",
  lawyer: "law attorney legal firm",
  restaurant: "eatery diner dining food meal eat",
  coffee_shop: "cafe coffeehouse coffee",
  plumber: "plumbing plumbers",
  hvac: "heating cooling air conditioning contractor",
  med_spa: "medspa spa medical aesthetics clinic",
  real_estate: "realtor realty agent broker",
  auto_repair: "mechanic garage car auto",
  salon: "hair beauty barber stylist",
};

/** What a library template is checked against: the kind of business, where it is, and what it lists. */
export type FitContext = {
  kind: string;
  city: string;
  region: string | null;
  services: string[];
  description: string;
  /** A counter or takeaway place: sit-down templates (date night, group booking) never fit it (business-kind.ts). */
  takeaway?: boolean;
};

/**
 * True when a library template fits this business (deterministic, after the model's pick too). A template that
 * names a cuisine, product or service ("sushi", "wine list", "cold brew") fits only a business that lists it. Past
 * that, a general question (plain words, the industry and the city) fits any business of the kind; a specific one
 * fits only when its tags or words match the services or description. With no services listed, only general ones.
 */
export function fitsBusiness(entry: Pick<LibraryEntry, "template" | "tags">, ctx: FitContext): boolean {
  const offered = `${ctx.services.join(" ; ")} ; ${ctx.description}`;
  const text = `${entry.template} ${entry.tags.join(" ")}`;
  if (ctx.takeaway && needsSitDown(entry.template)) return false;
  if (namesUnofferedTerm(text, ctx.services, ctx.description)) return false;
  if (isGeneralQuestion(entry.template, ctx.kind, ctx.city, ctx.region, [])) return true;
  if (ctx.services.length === 0) return false;
  // "roaster" and "roasts", "sandwiches" and "sandwich" are one word here.
  const root = (w: string) => (w.length > 4 ? stem(w).replace(/(?:ing|er|ed|e)$/, "") : stem(w));
  const ignore = new Set([ctx.kind, ctx.city, ctx.region ?? "", "city"].flatMap((s) => [...words(s)]).map(root));
  const specific = (s: string) => [...words(s)].filter((w) => w.length > 2 && !PLAIN_WORDS.has(w) && !PLAIN_WORDS.has(stem(w))).map(root).filter((w) => !ignore.has(w));
  const have = new Set(specific(offered));
  return specific(text).some((w) => have.has(w));
}
