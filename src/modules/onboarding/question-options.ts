// Pure: questions that weigh options instead of asking for a business, and comparisons left unfinished
// (question-rules uses both).

// An opening clause before the question itself: "For a slab leak, ...", "When it comes to short hair, ...".
// "Between the bookstores in {city}, which one is better..." names what is compared, so it is not one of these.
const LEAD = String.raw`^\s*(?:(?:for|when|if|as|with)\b[^,?]*,\s*)?`;
const COMPARATIVE = String.raw`(?:better|cheaper|faster|safer|quicker|nicer|easier|healthier|smarter|wiser|more\s+[\w-]+|less\s+[\w-]+)`;
// "Which is better", "What's cheaper", "Which one is more affordable", "Who is better": a comparison with no business
// as its subject. "Who has better reviews" asks for a business, so "who" only counts with "is".
const PRONOUN_HEAD = new RegExp(
  LEAD +
    String.raw`(?:(?:which|what)(?:'s|’s|\s+is|\s+are|\s+one\s+is|\s+ones\s+are|\s+would\s+be|\s+will\s+be|\s+has|\s+offers)|who(?:'s|’s|\s+is|\s+are|\s+would\s+be))\s+(?:a\s+|an\s+|the\s+)?` +
    COMPARATIVE +
    String.raw`\b(.*)$`,
  "i",
);
// "Is it better to hire...", "Is it smarter to repair or replace...": a yes or no about what to do.
const IS_IT = new RegExp(LEAD + String.raw`is it (?:better|best|smarter|wiser|cheaper|safer|easier|faster|worth|more\s+[\w-]+)\b`, "i");
// "Is CoolSculpting or laser lipo more effective", "Would a local plumber or a larger company be better": a yes or no
// between two options. "Is there a coffee shop that's better for working" asks for a business.
const YES_NO = new RegExp(LEAD + String.raw`(?:is|are|would|will)\s+(?!(?:there|any|anyone|anybody|someone|somebody)\b)`, "i");
const YES_NO_WEIGHS = /\b(?:better|best|more|less|cheaper|smarter|safer|worth|preferable)\b/i;
// Two options are named: "X or Y", "X versus Y", "X than Y", "between X and Y". "..., or do they all serve the same?"
// starts a new question, so it is not an option.
const OPTIONS =
  /\b(?:or|versus|vs\.?)\s+(?!(?:do|does|did|is|are|was|were|should|can|could|would|will|who|which|what|where|how|any|not|else)\b)\S|\bthan\b|\bcompared (?:to|with)\b|\bbetween\b[^?]*\band\b/i;
// "a big chain or a local shop", "large clinics or small offices", "a local plumber or a larger company": which kind
// of business to pick, not which business. AI answers it with pros and cons.
const SIZE_BIG = String.raw`(?:big(?:ger)?|large(?:r)?|national|corporate|chains?|franchises?)`;
const SIZE_SMALL = String.raw`(?:small(?:er)?|local|independent|indie|solo|family[- ]owned|mom[- ]and[- ]pop)`;
const KIND_CHOICE = new RegExp(
  String.raw`\b${SIZE_BIG}\b[^?]{0,40}?\b(?:or|versus|vs\.?)\s+(?:an?\s+|the\s+|one\s+)?${SIZE_SMALL}\b|\b${SIZE_SMALL}\b[^?]{0,40}?\b(?:or|versus|vs\.?)\s+(?:an?\s+|the\s+|one\s+(?:with\s+)?(?:an?\s+)?)?${SIZE_BIG}\b`,
  "i",
);
// "Which type of lawyer...", "What kind of salon...": asks which kind, not which one.
const TYPE_OF = /\b(?:which|what)\s+(?:type|kind|sort)s?\s+of\b/i;

const BUSINESS_WORD =
  /\b(?:clinic|office|practice|dentist|orthodontist|doctor|physician|med ?spa|spa|salon|studio|barber|shop|store|boutique|restaurant|diner|cafe|café|coffeehouse|bakery|bar|spot|place|center|centre|dealership|garage|mechanic|contractor|company|firm|agency|lawyer|attorney|realtor|agent|brokerage|plumber|electrician|technician|provider|specialist|business|bookstore|pizzeria|retailer)(?:e?s)?\b/i;

/** The comparison after a "which is better" opening, or null when the question has none or names a business first. */
function pronounComparison(question: string): string | null {
  const head = PRONOUN_HEAD.exec(question);
  if (!head) return null;
  // "Which is the better coffee shop in {city}..." names what it compares: a business.
  if (new RegExp(String.raw`^\s*(?:[\w'-]+\s+){0,2}?` + BUSINESS_WORD.source, "i").test(head[1])) return null;
  return head[1];
}

/**
 * True for a question that weighs options instead of asking for a business: two treatments or actions ("Botox or
 * microneedling", "repair or replace"), two kinds of business ("a chain or a local shop", "a dealership or an independent
 * shop"), or which type of business to pick. AI answers these with pros and cons, without naming a business
 * (2026-10-15, widened 2026-10-16). "Which restaurant serves better seafood, casual or fine dining?" asks which
 * restaurant, so it stays.
 */
export function comparesOptions(question: string): boolean {
  const rest = pronounComparison(question);
  if (rest !== null && OPTIONS.test(rest)) return true;
  if (IS_IT.test(question)) return true;
  if (YES_NO.test(question) && OPTIONS.test(question) && YES_NO_WEIGHS.test(question)) return true;
  return KIND_CHOICE.test(question) || TYPE_OF.test(question);
}

// Question words, helpers and request verbs: a question with none of them is a search phrase ("Best plumber in Austin?").
const ASKS =
  /\b(?:what|what's|whats|which|who|who's|whos|whom|whose|where|where's|how|is|are|can|could|do|does|would|will|should|any|anyone|recommend|recommendations|suggest|suggestions|ideas|need|looking|searching|seeking|trying|find|help|want|know)\b/i;

/**
 * True for a question that is not a full question: a comparison with nothing to compare ("Which is cheaper, the coffee
 * shops in Austin, TX?", "Which is better for drain cleaning, and who comes recommended?") or a bare search phrase
 * ("Best plumber in Austin?"). Real customers' questions ask for a business in a whole sentence (2026-10-16).
 */
export function isIncompleteQuestion(question: string): boolean {
  if (!ASKS.test(question.replace(/[’]/g, "'"))) return true;
  const rest = pronounComparison(question);
  return rest !== null && !OPTIONS.test(rest);
}
