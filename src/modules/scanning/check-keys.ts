import type { ScoreCheck } from "./scoring";

// Per-check values the score maths reads many times per page, worked out once per check (WeakMap, so they go with the
// checks). Pure.

// Each check's competitor names in lower case, worked out once: a page scores every competitor at every scan point,
// so the same names were lower-cased many thousands of times per request.
const loweredNames = new WeakMap<ScoreCheck, string[]>();

/** Whether AI named this competitor (`lowerName` already lower case) in the check: the name as tracked, any case. */
export function namesCompetitor(check: ScoreCheck, lowerName: string): boolean {
  let names = loweredNames.get(check);
  if (!names) {
    names = check.competitorsMentioned.map((n) => n.toLowerCase());
    loweredNames.set(check, names);
  }
  return names.includes(lowerName);
}

// Each check's cluster (one question on one AI tool) as one string, also worked out once per check for the same reason.
const clusterKeys = new WeakMap<ScoreCheck, string>();

export function clusterOf(check: ScoreCheck): string {
  let key = clusterKeys.get(check);
  if (key === undefined) {
    key = `${check.provider}:${check.questionId}`;
    clusterKeys.set(check, key);
  }
  return key;
}
