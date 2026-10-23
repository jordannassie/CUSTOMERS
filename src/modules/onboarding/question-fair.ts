// Whether a question is fair to ask for every business of its kind (MVP_SPEC 5.3, A8): a full question that asks for
// a business, not advice, not tied to the time, no stand-ins and no brand. Split from question-rules.ts. Pure.
import { namesBrand } from "./question-brands";
import { comparesOptions, isIncompleteQuestion } from "./question-options";

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

// "Portland, OR" is Oregon, not a choice: the advice and choice rules match "or" in any case, so a state code after a
// comma is taken out first (2026-10-16: "Where should I take my puppy in Portland, OR for its first vet visit?").
const withoutStateCodes = (question: string) => question.replace(/,\s*[A-Z]{2}\b/g, "");

/** True for a question a customer asks to find a business, which AI answers by naming some. */
export function asksForBusiness(question: string): boolean {
  const q = withoutStateCodes(question);
  return !ADVICE.some((re) => re.test(q)) && !SERVICE_FILLER.test(q) && !comparesOptions(q) && !isIncompleteQuestion(q);
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

// Stand-ins a writer left in (2026-10-15): "med spa A or med spa B", "dentist A or B", "option A or option B",
// "X or Y", "Company A", "[name]", "<industry>", or a {placeholder} other than {city}. "I" is never a stand-in
// ("should I or my partner"), and a letter after a real word ("Plan B", "vitamin A") is not one either.
const PLACEHOLDERS = [
  /\b[A-HJ-Z] (?:or|and|vs\.?|versus) (?:[a-z]+ ){0,3}[A-HJ-Z]\b/,
  /\b(?:[Oo]ption|[Bb]usiness|[Cc]ompany|[Bb]rand|[Pp]lace|[Ss]hop|[Ss]tore|[Pp]rovider|[Ff]irm|[Aa]gency) [A-Z]\b/,
  /\[[^\]]*\]/,
  /<[^>]*>/,
  /\{(?!city\})[^}]*\}/,
];

/** True for a question with a stand-in name or a placeholder left in it; never shown or asked. */
export function hasPlaceholder(question: string): boolean {
  return PLACEHOLDERS.some((re) => re.test(question));
}

export type QuestionProblem = "advice" | "choice" | "incomplete" | "time" | "near me" | "placeholder" | "brand";

/**
 * Why a question is not fair, or null: advice or filler; weighs options (question-options.ts); not a full question;
 * tied to the time or opening hours; "near me" (the AI only knows the city); a stand-in name; or a product brand,
 * chain or business name (question-brands.ts). `place` is the business's city, state and area, for filled-in text.
 */
export function questionProblem(question: string, place: string[] = []): QuestionProblem | null {
  if (hasPlaceholder(question)) return "placeholder";
  const plain = withoutStateCodes(question);
  if (ADVICE.some((re) => re.test(plain)) || SERVICE_FILLER.test(plain)) return "advice";
  if (comparesOptions(plain)) return "choice";
  if (isIncompleteQuestion(plain)) return "incomplete";
  if (dependsOnTime(question)) return "time";
  if (/\bnear me\b/i.test(question)) return "near me";
  if (namesBrand(question, place)) return "brand";
  return null;
}

/**
 * A question every business of the kind can be judged on: a full question that asks for a business, not advice or a
 * choice between options; not tied to the time or to opening hours; no "near me", no stand-in names, and no product
 * brand, chain or business name. For a template or a question without the city in it; filled-in text goes through
 * questionProblem with the place.
 */
export function isFairQuestion(question: string): boolean {
  return questionProblem(question) === null;
}
