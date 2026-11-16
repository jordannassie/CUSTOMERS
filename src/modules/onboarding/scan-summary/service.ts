// What the first scan screen shows while it runs and when it is done (DB-010). Pure, so every state is unit tested.
import { aboutInTen, namedMost, namedMostSentence, type AlsoRecommendedList } from "@/modules/scanning";

/** `unavailable`: why this AI is not being checked (out of credit), so the screen never shows it as running. */
export type ModelProgress = { id: string; done: number; total: number; asking: string | null; unavailable: string | null };

export type FirstScanSummary = {
  score: { value: number; tone: "good" | "mid" | "low"; sentence: string } | null;
  /** "AI named Bean House most often, in about 7 of 10 answers, one of the competitors you track." Null when AI named no other business. */
  namedMost: string | null;
  firstFix: { title: string; impact: "high" | "medium" | "low" } | null;
};

/**
 * Checks run question by question across every model, so each model's next question is the one after its saved
 * answers. `done` counts the answers saved so far per model.
 */
export function scanProgress(
  models: string[],
  questions: string[],
  done: Map<string, number>,
  outOfCredit: ReadonlySet<string> = new Set(),
): ModelProgress[] {
  return models.map((id) => {
    const count = Math.min(done.get(id) ?? 0, questions.length);
    // An AI out of credit has every check fail, so none is saved: say so instead of "asking" forever (2026-11-16).
    const unavailable = outOfCredit.has(id) && count === 0 ? "Out of credit" : null;
    return { id, done: count, total: questions.length, asking: unavailable ? null : (questions[count] ?? null), unavailable };
  });
}

export { aboutInTen };

/** The business AI named most, in the same words as the Overview's "Who AI picked instead" (step 6a). */
export function namedMostText(
  competitors: { name: string; score: number; chain?: string | null }[],
  also: AlsoRecommendedList,
): string | null {
  const top = namedMost(competitors, also);
  return top && namedMostSentence(top);
}
