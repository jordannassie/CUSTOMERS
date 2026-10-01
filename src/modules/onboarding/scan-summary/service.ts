// What the first scan screen shows while it runs and when it is done (DB-010). Pure, so every state is unit tested.

export type ModelProgress = { id: string; done: number; total: number; asking: string | null };

export type FirstScanSummary = {
  score: { value: number; tone: "good" | "mid" | "low"; sentence: string } | null;
  /** "AI named Bean House most often, in about 7 of 10 answers." Null when AI named no other business. */
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

/** "about 7 of 10" from a 0 to 100 rate, worded like the score sentence (D-63). */
export function aboutInTen(rate: number): string {
  const inTen = Math.round(rate / 10);
  return inTen === 0 ? "fewer than 1 of 10" : `about ${inTen} of 10`;
}

/** The business AI named most: a tracked competitor by its score, or another name by its share of answers. */
export function namedMostText(
  competitors: { name: string; score: number }[],
  also: { names: { name: string; answers: number }[]; answers: number },
): string | null {
  const candidates = [
    ...competitors.map((c) => ({ name: c.name, rate: c.score })),
    ...also.names.map((n) => ({ name: n.name, rate: also.answers > 0 ? (100 * n.answers) / also.answers : 0 })),
  ].filter((c) => c.rate > 0);
  if (candidates.length === 0) return null;
  const top = candidates.reduce((best, c) => (c.rate > best.rate ? c : best));
  return `AI named ${top.name} most often, in ${aboutInTen(top.rate)} answers.`;
}
