import { groupBy } from "../scoring";

// Answer cache lifetime (MVP_SPEC 5.4).
const CACHE_LIFETIME_MS = 86_400_000;

export type SavedCheck = {
  id: string;
  provider: string;
  questionId: string;
  checkedAt: Date;
  cached: boolean;
};

/**
 * Answer keys for saved checks, which store no cache key. A cache hit less than 24 hours after the first
 * check of this business's latest answer to the same question and model shares that answer's key; otherwise
 * every check is its own answer. When unsure this merges answers, so the margin errs wide, never narrow.
 */
export function answerKeys(checks: SavedCheck[]): Map<string, string> {
  const keys = new Map<string, string>();
  const sorted = [...checks].sort((a, b) => a.checkedAt.getTime() - b.checkedAt.getTime());
  for (const group of groupBy(sorted, (c) => `${c.provider}|${c.questionId}`).values()) {
    let answer: { key: string; firstAt: number } | null = null;
    for (const check of group) {
      const at = check.checkedAt.getTime();
      // A cached answer is never older than 24 hours, so a hit after that is a different answer.
      if (!(check.cached && answer && at - answer.firstAt < CACHE_LIFETIME_MS)) answer = { key: check.id, firstAt: at };
      keys.set(check.id, answer.key);
    }
  }
  return keys;
}
