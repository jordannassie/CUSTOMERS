import type { ScanFrequency } from "@/modules/credits";
import type { ModelAppearance, ProviderId } from "@/modules/scanning";

// What the Questions page shows (B-53, MVP_SPEC 5.3, 8.1). Pure, so every state is unit tested.

export const MODEL_LABELS: Record<ProviderId, string> = { openai: "ChatGPT", anthropic: "Claude", perplexity: "Perplexity" };
export const FREQUENCY_WORDS: Record<ScanFrequency, string> = { daily: "daily", weekly: "weekly", monthly: "monthly" };

export type QuestionRecord = { id: string; prompt: string; active: boolean; source: string };

export type QuestionResult = { model: ProviderId; label: string; appeared: number; checks: number };

export type QuestionRow = { id: string; text: string; active: boolean; custom: boolean; results: QuestionResult[] };

export type QuestionsView = {
  businessId: string;
  city: string | null;
  models: { id: ProviderId; label: string }[];
  frequency: ScanFrequency;
  active: QuestionRow[];
  paused: QuestionRow[];
  /** Most active questions the plan allows; null when unlimited. */
  limit: number | null;
};

export function questionsView(input: {
  businessId: string;
  city: string | null;
  models: ProviderId[];
  frequency: ScanFrequency;
  questions: QuestionRecord[];
  results: Map<string, ModelAppearance[]>;
  limit: number | null;
}): QuestionsView {
  const rows = input.questions.map((q): QuestionRow => {
    const seen = input.results.get(q.id) ?? [];
    return {
      id: q.id,
      text: q.prompt,
      active: q.active,
      custom: q.source === "custom",
      results: input.models.map((model) => {
        const r = seen.find((a) => a.model === model);
        return { model, label: MODEL_LABELS[model], appeared: r?.appeared ?? 0, checks: r?.checks ?? 0 };
      }),
    };
  });
  return {
    businessId: input.businessId,
    city: input.city,
    models: input.models.map((id) => ({ id, label: MODEL_LABELS[id] })),
    frequency: input.frequency,
    active: rows.filter((r) => r.active),
    paused: rows.filter((r) => !r.active),
    limit: input.limit,
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

export function resultText(r: Pick<QuestionResult, "appeared" | "checks">): string {
  if (r.checks === 0) return "Not checked yet";
  return `Appeared in ${r.appeared} of the last ${r.checks} ${r.checks === 1 ? "check" : "checks"}`;
}

export function atLimit(activeCount: number, limit: number | null): boolean {
  return limit !== null && activeCount >= limit;
}

export function limitText(limit: number): string {
  return `You have ${limit} active questions, the most your plan allows. Pause or remove one to add another.`;
}
