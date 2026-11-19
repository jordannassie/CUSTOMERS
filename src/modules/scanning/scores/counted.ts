import type { ProviderId } from "../providers/types";
import { checksInWindow } from "../scoring";

// Which answers count in the visibility score (MVP_SPEC 5.6, BUG-129). The one place this rule lives: the score, its
// confidence, trend, per-AI scores, competitor rates and the opportunities all read their answers through it.

export type TrackedQuestion = {
  id: string;
  source: string;
  active: boolean;
  /** When it stopped being asked; null while active, or for a question stopped before this was recorded. */
  inactiveSince?: string | null;
};

/** A question the user wrote or edited ("custom"), or an old prompt kept from before the library ("legacy"). */
export function isOwnQuestion(source: string): boolean {
  return source !== "library";
}

/**
 * Only suggested questions that are active now count. Questions the user wrote could raise the score at will, and
 * a paused or removed question's past answers stop counting, so the score covers the questions tracked now.
 */
export function countsInScore(question: Pick<TrackedQuestion, "source" | "active">): boolean {
  return question.active && !isOwnQuestion(question.source);
}

/**
 * Splits saved answers into the ones the score counts and the ones from the user's own active questions. Answers to
 * paused or removed questions, or with no question, are in neither.
 */
export function splitByQuestion<T extends { questionId: string }>(
  checks: T[],
  questions: TrackedQuestion[],
  options: { history?: boolean } = {},
): { scored: (T & { activeUntil?: Date })[]; own: T[] } {
  const scoredIds = new Set(questions.filter(countsInScore).map((q) => q.id));
  const ownIds = new Set(questions.filter((q) => q.active && isOwnQuestion(q.source)).map((q) => q.id));
  // For scores read at past moments (history, weekly changes): a suggested question that stopped at a known time
  // still counts before then (step 9e). Today's score never sees it: checksInWindow drops it from that moment on.
  const stopped = new Map(
    options.history
      ? questions.filter((q) => !q.active && q.inactiveSince && !isOwnQuestion(q.source)).map((q) => [q.id, new Date(q.inactiveSince!)])
      : [],
  );
  return {
    scored: checks.flatMap((c) => {
      if (scoredIds.has(c.questionId)) return [c];
      const until = stopped.get(c.questionId);
      return until ? [{ ...c, activeUntil: until }] : [];
    }),
    own: checks.filter((c) => ownIds.has(c.questionId)),
  };
}

export type OwnQuestionsResult = { named: number; answers: number };

/** "Named in 3 of 9 answers" over the user's own questions in the score window; null when they have no answers. */
export function ownQuestionsResult(
  own: { provider: ProviderId; checkedAt: Date; mentioned: boolean }[],
  opts: { now: Date; models: readonly ProviderId[] },
): OwnQuestionsResult | null {
  const answers = checksInWindow(own, opts.now).filter((c) => opts.models.includes(c.provider));
  if (answers.length === 0) return null;
  return { named: answers.filter((c) => c.mentioned).length, answers: answers.length };
}
