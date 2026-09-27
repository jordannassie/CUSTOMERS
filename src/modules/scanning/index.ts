// The only file other modules may import from (eslint-plugin-boundaries).
export { countryCode, runScan, type ScanDeps, type ScanOutcome } from "./service";
export { detectMentions, type MentionTarget } from "./mentions";
export { liveCheckRunner } from "./runs/dal";
export { CHECK_MODELS } from "./providers/models";
export type { CheckResult, ProviderId } from "./providers/types";
export { getScoreReport, loadScoreReport, type ScoreReport } from "./scores/dal";
export { compareWithCompetitor, isRealChange, type Confidence, type Estimate, type Standing } from "./scoring";
