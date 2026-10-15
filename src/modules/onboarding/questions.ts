// Prepares a business's questions at onboarding (MVP_SPEC 5.3, D-62). The library and the model are
// injected, so tests and evals run the same flow with fixtures. A model failure never reaches the
// user: the old template engine fills in.
import { tidyPlace } from "./question-style";
import { INDUSTRY_LABELS, isIndustry, type LibraryIndustry } from "@/lib/industries";
import { SEARCH_TERMS } from "./competitors";
import type { Intent } from "@/modules/question-library";
import type { QuestionModel } from "./question-model";
import { PICK_MODEL, PICK_PROMPT_VERSION, QUESTION_COUNT, type PickBusiness } from "./prompts/pick-questions.v7";
import {
  balancePicks,
  cityLabel,
  fallbackQuestions,
  fillCity,
  fitsBusiness,
  hasPlaceholder,
  isFairQuestion,
  KIND_WORDS,
  isGeneralQuestion,
  isUsableTemplate,
  mixesServices,
  namesUnofferedTerm,
  type FitContext,
  type LibraryEntry,
  type PreparedQuestion,
} from "./question-rules";
import { namesOwnBusiness, ownNames, withoutNames } from "./question-kind";
import { businessKind, type BusinessKind } from "./business-kind";
import { withKindQuestions } from "./kind-questions";
import { withArea } from "./question-area";

export { AREA_QUESTIONS, areaLabel } from "./question-area";

export type QuestionBusiness = {
  /** One of INDUSTRIES; anything else (or "other") has no library. */
  industry: string | null;
  /** The user's own words for their trade when it is "other", e.g. "florist". */
  industryText?: string;
  services: string[];
  description: string;
  city: string;
  region: string | null;
  /** Neighbourhood or area of the city ("East Austin"): some questions ask about it too. */
  area?: string | null;
  /** The business's own name, other names and website: never sent to the writer or kept in a question. */
  name?: string;
  aliases?: string[];
  domain?: string | null;
  /** Google's types for its listing, read live and never stored (D-73): "fast_food_restaurant" makes it fast food. */
  primaryType?: string | null;
  types?: string[];
  /** Several locations under one brand (businesses.is_chain): some questions ask about chains. */
  chain?: boolean;
};

export type LoadLibrary = (industry: LibraryIndustry) => Promise<LibraryEntry[]>;
/** Questions already chosen for another business of this industry in this city, oldest set first. */
export type LoadShared = (industry: string, city: string, region: string | null) => Promise<{ text: string; intent: Intent }[]>;
/** Google's types for a listing, read live (never stored, D-73); null when Google can't say. */
export type LoadPlaceTypes = (placeId: string) => Promise<{ primaryType: string | null; types: string[] } | null>;
export type QuestionClients = { loadLibrary: LoadLibrary; model: QuestionModel; loadShared?: LoadShared; placeTypes?: LoadPlaceTypes };

/** The listing's types for the kind of business; nothing when there is no listing or Google fails. */
export async function placeTypesOf(placeId: string | null, clients: QuestionClients) {
  if (!placeId || !clients.placeTypes) return {};
  const found = await clients.placeTypes(placeId).catch(() => null);
  return found ? { primaryType: found.primaryType, types: found.types } : {};
}

export type QuestionSet = {
  questions: PreparedQuestion[];
  /** library: picked from reviewed templates; written: Claude wrote them; fallback: the old template engine. */
  source: "library" | "written" | "fallback";
  /** No library for this industry yet: show it in admin as a candidate for a new one. */
  libraryCandidate: boolean;
  promptVersion: string;
  model: string | null;
  /** Why the model's answer was not used, for logs only. */
  error: string | null;
};

function libraryIndustry(industry: string | null): LibraryIndustry | null {
  return industry && isIndustry(industry) && industry !== "other" ? industry : null;
}

function industryLabel(b: QuestionBusiness): string {
  const known = libraryIndustry(b.industry);
  return known ? INDUSTRY_LABELS[known] : b.industryText?.trim() || "local business";
}

/** What the business is, as a customer would say it: "HVAC contractor", "sportswear store". */
function industryNoun(b: QuestionBusiness): string {
  const known = libraryIndustry(b.industry);
  return (known ? SEARCH_TERMS[known] : null) ?? (b.industryText?.trim() || "local business");
}

export async function prepareQuestions(given: QuestionBusiness, clients: QuestionClients): Promise<QuestionSet> {
  if (!given.city.trim()) throw new Error("A city is required to prepare questions");
  // The user's own words for an unlisted trade may hold the business's name; only the kind of business is kept.
  const business = { ...given, industryText: withoutNames(given.industryText ?? "", ownNames(given)) || undefined };
  const kind = kindOf(business);
  const set = await citySet(business, kind, clients);
  // Fast food never gets sit-down questions; product and chain questions come from its kind (business-kind.ts).
  const plain = fallbackQuestions(kind.noun, business.city, business.region);
  const fitted = withKindQuestions(set.questions, kind, cityLabel(business.city, business.region), plain, business.services);
  // Every path (library, written, reused from a neighbour, plain) writes the place as a person would.
  const questions = withArea(fitted, business).map((q) => ({ ...q, text: tidyPlace(q.text, business.city, business.region) }));
  return { ...set, questions };
}

function kindOf(b: QuestionBusiness): BusinessKind {
  return businessKind({ industry: b.industry, noun: industryNoun(b), services: b.services, primaryType: b.primaryType, types: b.types, chain: b.chain });
}

async function citySet(business: QuestionBusiness, kind: BusinessKind, clients: QuestionClients): Promise<QuestionSet> {
  const city = cityLabel(business.city, business.region);
  const input: PickBusiness = { industry: industryLabel(business), kind: kind.label, services: business.services, description: business.description };
  const known = libraryIndustry(business.industry);
  const library = known ? await clients.loadLibrary(known) : [];
  const base = { promptVersion: PICK_PROMPT_VERSION, model: PICK_MODEL, error: null };

  // No library for this industry yet: another business of the same kind in the same city already has a set, so
  // this one gets its general questions too. Two bookstores in Austin got two unrelated sets before, and their
  // results could not be compared (BUG-116). Anything specific to the other business is left behind (A8).
  const shared = library.length === 0 ? await sharedQuestions(business, clients) : [];
  if (shared.length >= QUESTION_COUNT) {
    return { questions: shared.slice(0, QUESTION_COUNT), source: "written", libraryCandidate: true, promptVersion: PICK_PROMPT_VERSION, model: null, error: null };
  }

  try {
    if (library.length > 0) {
      return { ...base, ...(await fromLibrary(input, business, library, city, clients.model)), source: "library", libraryCandidate: false };
    }
    // One more try before the plain fallback: a failed call made one business's set unlike its neighbours'.
    const questions = await written(input, business, clients.model).catch(() => written(input, business, clients.model));
    return { ...base, questions: withShared(shared, questions, business.services), source: "written", libraryCandidate: true };
  } catch (err) {
    return {
      questions: withShared(shared, fallbackQuestions(industryNoun(business), business.city, business.region), business.services),
      source: "fallback",
      libraryCandidate: library.length === 0,
      promptVersion: PICK_PROMPT_VERSION,
      model: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** The general questions kept from a neighbour's set come first; the rest is written from this business's own services. */
function withShared(shared: PreparedQuestion[], own: PreparedQuestion[], services: string[]): PreparedQuestion[] {
  if (shared.length === 0) return own;
  const entry = (q: PreparedQuestion) => ({ template: q.text, tags: [] as string[], intent: q.intent });
  return balancePicks(shared.map(entry), [...shared, ...own].map(entry), services).map((q) => ({ text: q.template, intent: q.intent, templateId: null }));
}

async function sharedQuestions(business: QuestionBusiness, clients: QuestionClients): Promise<PreparedQuestion[]> {
  const kind = business.industryText?.trim() || business.industry?.trim();
  if (!clients.loadShared || !kind || kind === "other") return [];
  const all = await clients.loadShared(kind, business.city, business.region);
  // Only questions that fit any business of the kind: "a bookstore with a coffee shop" stays with the shop it was
  // written for even when this one lists coffee too, since it is written from this business's own services below.
  const general = all
    .filter((q) => isGeneralQuestion(q.text, kind, business.city, business.region, []) && !hasPlaceholder(q.text))
    .map((q) => ({ template: q.text, tags: [] as string[], intent: q.intent }));
  // The same intent mix as any other set.
  return balancePicks(general, general, business.services).map((q) => ({ text: q.template, intent: q.intent, templateId: null }));
}

/** What the fit filter checks a library template against (question-rules.ts fitsBusiness). */
function fitContext(business: QuestionBusiness): FitContext {
  const known = libraryIndustry(business.industry);
  return {
    kind: `${industryLabel(business)} ${industryNoun(business)} ${known ? KIND_WORDS[known] : ""}`,
    city: business.city,
    region: business.region,
    services: business.services,
    description: business.description,
  };
}

async function fromLibrary(input: PickBusiness, business: QuestionBusiness, library: LibraryEntry[], city: string, model: QuestionModel) {
  const toQuestion = (e: LibraryEntry): PreparedQuestion => ({ text: fillCity(e.template, city), intent: e.intent, templateId: e.id });
  // Only templates that fit this business, checked in code before and after the model: a fried chicken restaurant
  // never gets the library's sushi, steak or wine questions, whatever the model picks. Fair questions only, as for
  // written ones.
  const ctx = { ...fitContext(business), takeaway: kindOf(business).takeaway };
  const fit = library.filter((e) => isUsableTemplate(e.template) && isFairQuestion(e.template) && fitsBusiness(e, ctx));
  let picked: LibraryEntry[];
  let asked = false;
  // A list this short leaves nothing to choose, so no call is made.
  if (fit.length <= QUESTION_COUNT) picked = fit;
  else {
    asked = true;
    // Only fitting templates are shown, under their library numbers; the answer is checked against the fit list too.
    const numbers = await model.pick({
      business: input,
      templates: fit.map((e) => ({ number: library.indexOf(e) + 1, template: e.template, tags: e.tags, intent: e.intent })),
    });
    const fits = new Set(fit);
    const chosen = numbers.filter((n) => n >= 1 && n <= library.length && fits.has(library[n - 1])).map((n) => library[n - 1]);
    // Fewer than half usable means the answer ignored the list; the fallback is safer than guessing.
    if (new Set(chosen).size < QUESTION_COUNT / 2) throw new Error(`Claude picked ${new Set(chosen).size} usable templates`);
    picked = balancePicks(chosen, fit, input.services);
  }
  const questions = picked.map(toQuestion);
  if (questions.length >= QUESTION_COUNT) return { questions, ...(asked ? {} : { model: null }) };
  // Never padded with templates that do not fit: written questions (v4 rules) fill the rest, then plain ones.
  const filled = await topUp(questions, input, business, model);
  return { questions: filled.questions, ...(asked || filled.wrote ? {} : { model: null }) };
}

async function topUp(have: PreparedQuestion[], input: PickBusiness, business: QuestionBusiness, model: QuestionModel) {
  let wrote = true;
  const extra = await written(input, business, model).catch(() => {
    wrote = false;
    return fallbackQuestions(industryNoun(business), business.city, business.region);
  });
  const entry = (q: PreparedQuestion) => ({ template: q.text, tags: [] as string[], intent: q.intent, question: q });
  return { questions: balancePicks(have.map(entry), extra.map(entry), []).map((e) => e.question), wrote };
}

async function written(input: PickBusiness, business: QuestionBusiness, model: QuestionModel): Promise<PreparedQuestion[]> {
  const city = cityLabel(business.city, business.region);
  // Candidates are written from the industry alone (prompt v3); the business's services only choose among them,
  // like picking from a library, so no question exists only because this business listed it (BUG-130).
  const drafts = (await model.write({ business: input }))
    .filter(
      (q) =>
        isUsableTemplate(q.template) &&
        isFairQuestion(q.template) &&
        !namesOwnBusiness(q.template, business) &&
        !mixesServices(q.template, input.services) &&
        !namesUnofferedTerm(q.template, input.services, input.description),
    )
    .map((q) => ({ template: fillCity(q.template, city), tags: [] as string[], intent: q.intent }));
  const kept = balancePicks([], drafts, input.services);
  if (kept.length < QUESTION_COUNT / 2) throw new Error(`Claude wrote ${kept.length} usable questions`);
  // A few unusable drafts are topped up with plain questions rather than asking again.
  const extra = fallbackQuestions(industryNoun(business), business.city, business.region).map((q) => ({
    template: q.text,
    tags: [],
    intent: q.intent,
  }));
  return balancePicks(kept, extra, []).map((q) => ({ text: q.template, intent: q.intent, templateId: null }));
}
