// Prepares a business's questions at onboarding (MVP_SPEC 5.3, D-62). The library and the model are
// injected, so tests and evals run the same flow with fixtures. A model failure never reaches the
// user: the old template engine fills in.
import { INDUSTRY_LABELS, isIndustry, type LibraryIndustry } from "@/lib/industries";
import type { QuestionModel } from "./question-model";
import { PICK_MODEL, PICK_PROMPT_VERSION, QUESTION_COUNT, type PickBusiness } from "./prompts/pick-questions.v1";
import {
  balancePicks,
  cityLabel,
  fallbackQuestions,
  fillCity,
  isUsableTemplate,
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
};

export type LoadLibrary = (industry: LibraryIndustry) => Promise<LibraryEntry[]>;
export type QuestionClients = { loadLibrary: LoadLibrary; model: QuestionModel };

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

export async function prepareQuestions(business: QuestionBusiness, clients: QuestionClients): Promise<QuestionSet> {
  if (!business.city.trim()) throw new Error("A city is required to prepare questions");
  const city = cityLabel(business.city, business.region);
  const input: PickBusiness = { industry: industryLabel(business), services: business.services, description: business.description };
  const known = libraryIndustry(business.industry);
  const library = known ? await clients.loadLibrary(known) : [];
  const base = { promptVersion: PICK_PROMPT_VERSION, model: PICK_MODEL, error: null };

  try {
    if (library.length > 0) {
      return { ...base, ...(await fromLibrary(input, library, city, clients.model)), source: "library", libraryCandidate: false };
    }
    return { ...base, questions: await written(input, business, clients.model), source: "written", libraryCandidate: true };
  } catch (err) {
    return {
      questions: fallbackQuestions(input.industry, business.city, business.region),
      source: "fallback",
      libraryCandidate: library.length === 0,
      promptVersion: PICK_PROMPT_VERSION,
      model: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
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
  const drafts = (await model.write({ business: input }))
    .filter((q) => isUsableTemplate(q.template))
    .map((q) => ({ template: fillCity(q.template, city), tags: [] as string[], intent: q.intent }));
  const kept = balancePicks(drafts, drafts, input.services);
  if (kept.length < QUESTION_COUNT / 2) throw new Error(`Claude wrote ${kept.length} usable questions`);
  // A few unusable drafts are topped up from the template engine rather than asking again.
  const extra = fallbackQuestions(input.industry, business.city, business.region).map((q) => ({ template: q.text, tags: [], intent: q.intent }));
  return balancePicks(kept, extra, []).map((q) => ({ text: q.template, intent: q.intent, templateId: null }));
}
