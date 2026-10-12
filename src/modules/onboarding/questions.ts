// Prepares a business's questions at onboarding (MVP_SPEC 5.3, D-62). The library and the model are
// injected, so tests and evals run the same flow with fixtures. A model failure never reaches the
// user: the old template engine fills in.
import { INDUSTRY_LABELS, isIndustry, type LibraryIndustry } from "@/lib/industries";
import { SEARCH_TERMS } from "./competitors";
import type { Intent } from "@/modules/question-library";
import type { QuestionModel } from "./question-model";
import { PICK_MODEL, PICK_PROMPT_VERSION, QUESTION_COUNT, type PickBusiness } from "./prompts/pick-questions.v3";
import {
  balancePicks,
  cityLabel,
  fallbackQuestions,
  fillCity,
  isFairQuestion,
  isGeneralQuestion,
  isUsableTemplate,
  mixesServices,
  type LibraryEntry,
  type PreparedQuestion,
} from "./question-rules";

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
};

export type LoadLibrary = (industry: LibraryIndustry) => Promise<LibraryEntry[]>;
/** Questions already chosen for another business of this industry in this city, oldest set first. */
export type LoadShared = (industry: string, city: string, region: string | null) => Promise<{ text: string; intent: Intent }[]>;
export type QuestionClients = { loadLibrary: LoadLibrary; model: QuestionModel; loadShared?: LoadShared };

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

export async function prepareQuestions(business: QuestionBusiness, clients: QuestionClients): Promise<QuestionSet> {
  if (!business.city.trim()) throw new Error("A city is required to prepare questions");
  const set = await citySet(business, clients);
  return { ...set, questions: withArea(set.questions, business) };
}

async function citySet(business: QuestionBusiness, clients: QuestionClients): Promise<QuestionSet> {
  const city = cityLabel(business.city, business.region);
  const input: PickBusiness = { industry: industryLabel(business), services: business.services, description: business.description };
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
      return { ...base, ...(await fromLibrary(input, library, city, clients.model)), source: "library", libraryCandidate: false };
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
    .filter((q) => isGeneralQuestion(q.text, kind, business.city, business.region, []))
    .map((q) => ({ template: q.text, tags: [] as string[], intent: q.intent }));
  // The same intent mix as any other set.
  return balancePicks(general, general, business.services).map((q) => ({ text: q.template, intent: q.intent, templateId: null }));
}

async function fromLibrary(input: PickBusiness, library: LibraryEntry[], city: string, model: QuestionModel) {
  const toQuestion = (e: LibraryEntry): PreparedQuestion => ({ text: fillCity(e.template, city), intent: e.intent, templateId: e.id });
  // A library this small leaves nothing to choose, so no call is made.
  if (library.length <= QUESTION_COUNT) return { questions: library.map(toQuestion), model: null };
  const numbers = await model.pick({
    business: input,
    templates: library.map((e, i) => ({ number: i + 1, template: e.template, tags: e.tags, intent: e.intent })),
  });
  const chosen = numbers.filter((n) => n >= 1 && n <= library.length).map((n) => library[n - 1]);
  // Fewer than half usable means the answer ignored the list; the fallback is safer than guessing.
  if (new Set(chosen).size < QUESTION_COUNT / 2) throw new Error(`Claude picked ${new Set(chosen).size} usable templates`);
  return { questions: balancePicks(chosen, library, input.services).map(toQuestion) };
}

async function written(input: PickBusiness, business: QuestionBusiness, model: QuestionModel): Promise<PreparedQuestion[]> {
  const city = cityLabel(business.city, business.region);
  // Candidates are written from the industry alone (prompt v3); the business's services only choose among them,
  // like picking from a library, so no question exists only because this business listed it (BUG-130).
  const drafts = (await model.write({ business: input }))
    .filter((q) => isUsableTemplate(q.template) && isFairQuestion(q.template) && !mixesServices(q.template, input.services))
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

/** How many of the 12 ask about the business's own part of the city when it has one. */
export const AREA_QUESTIONS = 4;

/**
 * "East Austin, TX" or "Hyde Park, Austin, TX": the area with the city it is in. Questions keep the city so the
 * AI knows which East Austin, and businesses in the same area share the wording (and the answer cache).
 */
export function areaLabel(area: string, city: string, region: string | null): string {
  const where = cityLabel(city, region);
  const inName = new RegExp(`\\b${city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(area);
  return inName ? where.replace(city.trim(), area.trim()) : `${area.trim()}, ${where}`;
}

/**
 * A small shop measured only against its whole city always looks invisible (BUG-131). With an area set, a few of
 * the "best", "reviews" and "price" questions ask about the area instead; the rest stay city-wide.
 */
function withArea(questions: PreparedQuestion[], business: QuestionBusiness): PreparedQuestion[] {
  const area = business.area?.trim();
  if (!area) return questions;
  const city = cityLabel(business.city, business.region);
  const local = areaLabel(area, business.city, business.region);
  if (local === city) return questions;
  const order = ["best", "reviews", "price", "best", "comparison", "reviews"];
  const chosen = new Set<number>();
  for (const intent of order) {
    if (chosen.size >= AREA_QUESTIONS) break;
    const i = questions.findIndex((q, n) => !chosen.has(n) && q.intent === intent && q.text.includes(city));
    if (i >= 0) chosen.add(i);
  }
  return questions.map((q, n) => (chosen.has(n) ? { ...q, text: q.text.replace(city, local) } : q));
}
