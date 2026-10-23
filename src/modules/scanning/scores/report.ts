// The score report every page reads (B-30 step 2); split from dal.ts to keep it under the size limit.
import type { OwnChain } from "../branch";
import type { CompetitorCharts } from "../charts";
import type { ProviderId } from "../providers/types";
import type { CompetitorScore, TrendPoint, VisibilityScore } from "../scoring";
import type { Change, ScanPoint } from "../scoring-periods";
import type { OwnQuestionsResult } from "./counted";

export type ScoreReport = VisibilityScore & {
  /** The business's chosen models, in the order it saved them. */
  models: ProviderId[];
  trend: TrendPoint[];
  /** The 30-day score at each scan over the `historyDays` asked for, oldest first (DB-002). */
  history: ScanPoint[];
  /** The 30-day score now against the 30-day score a week ago, only outside the margin (D-64). */
  change: Change | null;
  /** Each model's 30-day score against a week ago, only where it is bigger than the margin (DB-013). */
  modelChanges: Partial<Record<ProviderId, Change>>;
  /** The 30-day score against 30 days ago; null unless `historyDays` reaches 30 (DB-012). */
  monthChange: Change | null;
  /** The oldest check in the window; a competitor added after it was not looked for on every check (F-53). */
  firstCheckedAt: Date | null;
  lastCheckedAt: Date | null;
  competitors: {
    name: string;
    score: number;
    standing: CompetitorScore["standing"];
    /** Weekly change in how often AI named it, only outside the margin (DB-013). */
    change: Change | null;
    /** "Bennu Coffee" for a tracked "Bennu Coffee on Congress" when most answers named only the chain (branch.ts). */
    chain?: string | null;
  }[];
  /** Every active question, suggested or the user's own: each one is checked and charged on every scan. */
  questions: {
    id: string;
    question: string;
    appeared: number;
    checks: number;
  }[];
  /** The user's own active questions over the window, kept out of the score; null when they have no answers. */
  ownQuestions: OwnQuestionsResult | null;
  /** A business that is one branch: its chain's mentions, shown apart from the score (step 7). */
  ownChain: OwnChain | null;
  /** The Competitors page charts, only when asked for (ReportOptions.charts). */
  charts?: CompetitorCharts;
};
