// The only file other modules may import from (eslint-plugin-boundaries).
export { ALREADY_FINISHED, countryCode, runScan, type ScanDeps, type ScanOutcome } from "./service";
export { detectMentions, type MentionTarget } from "./mentions";
export { liveCheckRunner } from "./runs/dal";
export { CHECK_MODELS } from "./providers/models";
export type { CheckResult, ProviderId } from "./providers/types";
export { getScoreReport, loadQuestionResults, loadScoreReport, type ScoreReport } from "./scores/dal";
export type { ModelAppearance } from "./scores/questions";
export { loadAlsoRecommended } from "./also-recommended/dal";
export type { AlsoRecommended, AlsoRecommendedList } from "./also-recommended/names";
export {
  compareWithCompetitor,
  isRealChange,
  SCORE_WINDOW_DAYS,
  type Change,
  type Confidence,
  type Estimate,
  type Standing,
  type TrendPoint,
} from "./scoring";
