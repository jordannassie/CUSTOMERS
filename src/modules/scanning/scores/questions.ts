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

export type ModelAppearance = { model: ProviderId; appeared: number; checks: number };

/** The same count split by model, for the Questions page (B-53). Models with no check are left out. */
export function questionAppearancesByModel(
  checks: ScoreCheck[],
  opts: { now: Date; models: readonly ProviderId[]; last?: number },
): Map<string, ModelAppearance[]> {
  const byQuestion = new Map<string, ModelAppearance[]>();
  for (const model of opts.models) {
    for (const a of questionAppearances(checks, { ...opts, models: [model] })) {
      const list = byQuestion.get(a.questionId) ?? [];
      list.push({ model, appeared: a.appeared, checks: a.checks });
      byQuestion.set(a.questionId, list);
    }
  }
  return byQuestion;
}
