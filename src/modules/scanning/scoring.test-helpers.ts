import type { ProviderId } from "./providers/types";
import type { ScoreCheck } from "./scoring";

// Fixed checks for the scoring tests.
export const NOW = new Date("2026-09-27T12:00:00Z");
export const MODELS: ProviderId[] = ["openai", "anthropic", "perplexity"];
export const HOUR = 3_600_000;
let nextId = 0;

export function check(
  provider: ProviderId,
  questionId: string,
  hoursAgo: number,
  mentioned: boolean,
  extra: Partial<ScoreCheck> = {},
): ScoreCheck {
  return {
    provider,
    questionId,
    checkedAt: new Date(NOW.getTime() - hoursAgo * HOUR),
    mentioned,
    competitorsMentioned: [],
    answerKey: `a${nextId++}`,
    ...extra,
  };
}

/** `mentions` of `total` checks on one model, one question each, all within the window. */
