// What the first scan screen shows while it runs and when it is done (DB-010). Pure, so every state is unit tested.
import { aboutInTen, namedMost, namedMostSentence, type AlsoRecommendedList } from "@/modules/scanning";

export type ModelProgress = { id: string; done: number; total: number; asking: string | null };

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
export function scanProgress(models: string[], questions: string[], done: Map<string, number>): ModelProgress[] {
  return models.map((id) => {
    const count = Math.min(done.get(id) ?? 0, questions.length);
    return { id, done: count, total: questions.length, asking: questions[count] ?? null };
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
