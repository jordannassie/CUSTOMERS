import { INDUSTRY_LABELS, isIndustry } from "@/lib/industries";
import type { ScanFrequency } from "@/modules/credits";
import type { ModelAppearance, ProviderId } from "@/modules/scanning";
import type { QuestionSummary } from "@/modules/standing";
import type { QuestionHistory, Trend } from "./history";
import type { FocusAnswer } from "./answers";
import { checkKey } from "./last-scan";

// What the Questions page shows (B-53, MVP_SPEC 5.3, 8.1). Pure, so every state is unit tested.

export const MODEL_LABELS: Record<ProviderId, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };
export const FREQUENCY_WORDS: Record<ScanFrequency, string> = { daily: "daily", weekly: "weekly", monthly: "monthly" };

/** `own`: the user wrote or edited it, so it is checked and charged but left out of the score (BUG-129). */
export type QuestionRecord = { id: string; prompt: string; active: boolean; own: boolean; topic?: string | null; createdAt?: string | null };

/**
 * `pips`: the same checks in order, oldest first, true where AI named you. `failedLastScan`: the last scan asked this
 * AI and got no answer (BUG-074).
 */
export type QuestionResult = { model: ProviderId; label: string; appeared: number; checks: number; pips: boolean[]; failedLastScan: boolean };

/** `custom`: the user's own question, labelled as not counted in the score (BUG-129). */
export type QuestionRow = {
  id: string;
  text: string;
  active: boolean;
  custom: boolean;
  /** The user's own tag, like "Delivery"; null when none. */
  topic: string | null;
  results: QuestionResult[];
  /** Answers that named you, out of every answer in the last 30 days. */
  named: number;
  answers: number;
  /** Latest scan of this question against the one before. */
  trend: Trend | null;
  /** False when the page's ?site= or ?named= link leaves it out. */
  matches: boolean;
  /** Who AI named on this question over 30 days, and the sites it used without you; null before any answer. */
  summary?: QuestionSummary | null;
};

export type QuestionsView = {
  businessId: string;
  businessName: string;
  city: string | null;
  /** The example under "Add your own question": one our own question rules keep (step 6c). */
  example: string;
  models: { id: ProviderId; label: string }[];
  frequency: ScanFrequency;
  active: QuestionRow[];
  paused: QuestionRow[];
  /** Most active questions the plan allows; null when unlimited. */
  limit: number | null;
  /** Which AIs the last scan could not check; null when every check worked. */
  scanNotice: string | null;
  /** Number the businesses in an answer by where AI listed them (SHOW_POSITION, D-63). */
  showPositions: boolean;
  /** Opened from "See the answers" (?site=, ?named=): the newest answers that link is about, and how many there are. */
  focusAnswers: { answers: FocusAnswer[]; total: number };
};

// The kind of business as a customer would say it; the labels with a note in brackets get a plain word.
const EXAMPLE_NOUNS: Partial<Record<string, string>> = { hvac: "heating and air conditioning company", salon: "salon", other: "business" };

/**
 * "Which coffee shop in Austin, TX do locals recommend most?" Never about opening hours, the time it is asked or
 * "near me": those questions are dropped from our own sets (BUG-130), so the example must not suggest one (step 6c).
 */
export function exampleQuestion(city: string | null, industry: string | null): string {
  const noun = EXAMPLE_NOUNS[industry ?? "other"] ?? (industry && isIndustry(industry) ? INDUSTRY_LABELS[industry].toLowerCase() : "business");
  return `Which ${noun} in ${city ?? "my city"} do locals recommend most?`;
}

export function questionsView(input: {
  businessId: string;
  businessName?: string;
  city: string | null;
  industry?: string | null;
  models: ProviderId[];
  frequency: ScanFrequency;
  questions: QuestionRecord[];
  /** Counts only; `history` gives the same counts with the pips in order, and wins when both are given. */
  results?: Map<string, ModelAppearance[]>;
  history?: Map<string, QuestionHistory>;
  limit: number | null;
  summaries?: Map<string, QuestionSummary>;
  /** The questions a ?site= or ?named= link keeps; undefined when there is no such link. */
  matching?: Set<string>;
  /** The last scan's notice and checkKey(question, AI) for each check it could not do. */
  lastScan?: { notice: string | null; failed: Set<string> };
  showPositions?: boolean;
  focusAnswers?: { answers: FocusAnswer[]; total: number };
}): QuestionsView {
  const rows = input.questions.map((q): QuestionRow => {
    const seen = input.results?.get(q.id) ?? [];
    const history = input.history?.get(q.id);
    const results = input.models.map((model): QuestionResult => {
      const failedLastScan = input.lastScan?.failed.has(checkKey(q.id, model)) ?? false;
      const pips = history?.pips[model];
      if (pips) return { model, label: MODEL_LABELS[model], appeared: pips.filter(Boolean).length, checks: pips.length, pips, failedLastScan };
      const r = seen.find((a) => a.model === model);
      const appeared = r?.appeared ?? 0;
      const checks = r?.checks ?? 0;
      // Counts alone: the named checks first.
      return { model, label: MODEL_LABELS[model], appeared, checks, pips: Array.from({ length: checks }, (_, i) => i < appeared), failedLastScan };
    });
    return {
      id: q.id,
      text: q.prompt,
      active: q.active,
      custom: q.own,
      topic: q.topic?.trim() || null,
      summary: input.summaries?.get(q.id) ?? null,
      results,
      named: history?.named ?? results.reduce((n, r) => n + r.appeared, 0),
      answers: history?.answers ?? results.reduce((n, r) => n + r.checks, 0),
      trend: history?.trend ?? null,
      matches: input.matching ? input.matching.has(q.id) : true,
    };
  });
  return {
    businessId: input.businessId,
    businessName: input.businessName ?? "",
    city: input.city,
    example: exampleQuestion(input.city, input.industry ?? null),
    models: input.models.map((id) => ({ id, label: MODEL_LABELS[id] })),
    frequency: input.frequency,
    active: rows.filter((r) => r.active),
    paused: rows.filter((r) => !r.active),
    limit: input.limit,
    scanNotice: input.lastScan?.notice ?? null,
    showPositions: input.showPositions ?? false,
    focusAnswers: input.focusAnswers ?? { answers: [], total: 0 },
  };
}

/** Capital first letter, single spaces and a question mark, the way the library writes them. */
export function tidyQuestion(text: string): string {
  const t = text.replace(/\s+/g, " ").trim().replace(/[.!\s]+$/, "");
  if (!t) return "";
  const q = t.endsWith("?") ? t : `${t}?`;
  return q[0].toUpperCase() + q.slice(1);
}

export const sameQuestion = (a: string, b: string) => tidyQuestion(a).toLowerCase() === tidyQuestion(b).toLowerCase();

export const FAILED_LAST_SCAN = "Couldn't be checked in the last scan";

export function resultText(r: Pick<QuestionResult, "appeared" | "checks"> & { failedLastScan?: boolean }): string {
  if (r.checks === 0) return r.failedLastScan ? FAILED_LAST_SCAN : "Not checked yet";
  const text = `Appeared in ${r.appeared} of the last ${r.checks} ${r.checks === 1 ? "check" : "checks"}`;
  return r.failedLastScan ? `${text}. ${FAILED_LAST_SCAN}` : text;
}

export function atLimit(activeCount: number, limit: number | null): boolean {
  return limit !== null && activeCount >= limit;
}

export function limitText(limit: number): string {
  return `You have ${limit} active questions, the most your plan allows. Pause or remove one to add another.`;
}

/**
 * Editing rewrites the question in place only while it is the user's own with no answers yet. Otherwise the old
 * answers belong to the old wording, so the edit saves a new question and pauses the old one (M2).
 */
export function editMakesNewQuestion(q: { custom: boolean; answered: boolean }): boolean {
  return !q.custom || q.answered;
}

/** The Questions page only knows the last 30 days of checks, which is what it shows the user. */
export const rowHasAnswers = (row: Pick<QuestionRow, "results">) => row.results.some((r) => r.checks > 0);

export function newQuestionWarning(active: boolean): string {
  return active
    ? "Editing makes this a new question. The old one is paused and keeps its results."
    : "Editing makes this a new question. The old one stays paused and keeps its results.";
}
