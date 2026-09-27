import type { ProviderId } from "../providers/types";
import { checksInWindow, groupBy, type ScoreCheck } from "../scoring";

export type QuestionAppearance = {
  questionId: string;
  appeared: number;
  checks: number;
};

/** "Appeared in X of the last Y checks" per question, over the window and at most `last` checks each. */
export function questionAppearances(
  checks: ScoreCheck[],
  opts: { now: Date; models: readonly ProviderId[]; last?: number },
): QuestionAppearance[] {
  const chosen = checksInWindow(checks, opts.now).filter((c) => opts.models.includes(c.provider));
  return [...groupBy(chosen, (c) => c.questionId)].map(([questionId, group]) => {
    const recent = group
      .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())
      .slice(0, opts.last ?? group.length);
    return {
      questionId,
      appeared: recent.filter((c) => c.mentioned).length,
      checks: recent.length,
    };
  });
}
