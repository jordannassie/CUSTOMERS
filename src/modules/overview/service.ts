import {
  SCORE_WINDOW_DAYS,
  type Change,
  type Confidence,
  type OwnChain,
  type OwnQuestionsResult,
  type ProviderId,
  type ScoreReport,
} from "@/modules/scanning";
import { coverageText, MODEL_LABELS, scanNoticeText, type ScanFailures } from "./coverage";
import { CALIBRATION, methodPanel, type Calibration, type MethodPanel } from "./method";
import { trendView, type TrendView } from "./trend";

export { coverageText, MODEL_LABELS, scanFailuresFrom, scanNoticeText, scanSkipsFrom, type ScanFailures } from "./coverage";

// What the Overview shows (B-49, MVP_SPEC 5.6, 8.1). Pure, so every state is unit tested.


const CONFIDENCE_LABELS: Record<Confidence, string> = {
  early: "Early estimate",
  good: "Good confidence",
  high: "High confidence",
};

const IMPACT_ORDER = { high: 0, medium: 1, low: 2 } as const;

export type Impact = keyof typeof IMPACT_ORDER;
export type Tone = "good" | "mid" | "low";

export type Opportunity = { id: string; title: string; impact: Impact; createdAt: string };

/** "Up 6": a change rounded to whole points, shown only when bigger than the margin (D-64). */
export type PointsChange = { direction: Change["direction"]; points: number };

export function pointsChange(change: Change | null | undefined): PointsChange | null {
  const points = change ? Math.round(change.points) : 0;
  return change && points > 0 ? { direction: change.direction, points } : null;
}

export type OverviewView = {
  score: {
    value: number;
    tone: Tone;
    label: string;
    sentence: string;
    /** "First results. Accuracy improves with every scan." while there is one scan's worth of data. */
    firstResults: boolean;
    change: { direction: Change["direction"]; text: string } | null;
    /** "Based on ChatGPT and Perplexity. Claude couldn't be checked." when a chosen AI has no checks (BUG-074). */
    coverage?: string | null;
    details: MethodPanel;
  } | null;
  /**
   * notChecked: no checks in the window and every check failed in the last scan, so "Couldn't be checked".
   * skipped: the last scan left this AI out because it was unavailable (a rejected key or no credit).
   */
  models: {
    id: ProviderId;
    label: string;
    score: number | null;
    notChecked?: boolean;
    skipped?: boolean;
    change: PointsChange | null;
    /** Against the 30 days before, for the monthly report; the Overview shows the weekly change. */
    monthChange?: PointsChange | null;
  }[];
  /** A scan that finished with some AIs failing: which ones, and that failed checks cost nothing (BUG-074). */
  scanNotice: string | null;
  trend: TrendView;
  opportunities: Pick<Opportunity, "id" | "title" | "impact">[];
  lastCheckedAt: string | null;
  /** The last 30 days against the 30 before, only when bigger than the margin (D-64). */
  monthChange: PointsChange | null;
  /** One credit per answer: active questions times chosen models. */
  scanCredits: number;
  /** "Your own questions: named in 3 of 9 answers. Not part of the score." Null when they have no answers (BUG-129). */
  ownQuestions: string | null;
  /** "Bennu Coffee (all locations): named in 9 of 36 answers..." for a business that is one branch (step 7). */
  ownChain: string | null;
};

/** DESIGN.md bands: 70 to 100 good, 40 to 69 mid, under 40 low. */
export function scoreTone(score: number): Tone {
  if (score >= 70) return "good";
  return score >= 40 ? "mid" : "low";
}

export function scoreSentence(score: number): string {
  const inTen = Math.round(score / 10);
  if (inTen === 0) {
    return score > 0
      ? "AI recommended you in fewer than 1 of 10 customer questions this month."
      : "AI did not recommend you in any customer questions this month.";
  }
  return `AI recommended you in about ${inTen} of 10 customer questions this month.`;
}

export function changeText(change: Change): string {
  const points = Math.round(change.points);
  return `${change.direction === "up" ? "Up" : "Down"} ${points} ${points === 1 ? "point" : "points"} on last week`;
}

/** A branch business's chain-wide mentions, apart from its score, which counts only the branch (step 7). */
export function ownChainText(chain: OwnChain | null): string | null {
  if (!chain || chain.named === 0) return null;
  const answers = `${chain.answers} ${chain.answers === 1 ? "answer" : "answers"}`;
  return `${chain.brand} (all locations): named in ${chain.named} of ${answers}. Your score counts only the answers that name your location.`;
}

/** The user's own questions, shown apart from the score they are not part of (BUG-129). */
export function ownQuestionsText(result: OwnQuestionsResult | null): string | null {
  if (!result) return null;
  const answers = `${result.answers} ${result.answers === 1 ? "answer" : "answers"}`;
  return `Your own questions: named in ${result.named} of ${answers}. Not part of the score.`;
}

/** Most important first, then newest; the Overview shows three. */
export function topOpportunities(opportunities: Opportunity[], count = 3): OverviewView["opportunities"] {
  return [...opportunities]
    .sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || b.createdAt.localeCompare(a.createdAt))
    .slice(0, count)
    .map(({ id, title, impact }) => ({ id, title, impact }));
}

/** Fewer different answers than this, with most of the last scan's checks for that AI failed, is no score for it. */
export const MIN_MODEL_ANSWERS = 3;

export function overviewView(
  report: ScoreReport,
  opportunities: Opportunity[],
  options: {
    nextScanAt?: Date | null;
    now?: Date;
    calibration?: Calibration | null;
    lastScanFailures?: ScanFailures | null;
    /** AIs the last scan left out because they were unavailable (scanSkipsFrom). */
    lastScanSkipped?: ProviderId[];
  } = {},
): OverviewView {
  const { nextScanAt = null, now = new Date(), calibration = CALIBRATION, lastScanFailures = null, lastScanSkipped = [] } = options;
  const { overall } = report;
  const scannedDays = report.trend.filter((p) => p.checks > 0).length;
  const byModel = new Map(report.byModel.map((m) => [m.model, m.estimate]));
  const models = report.models.map((id) => {
    const failed = lastScanFailures?.[id] ?? 0;
    // One cached answer while the rest of the scan failed is not a score for that AI: "Claude 0" there meant only
    // that Claude was out of credit (First Light, 2026-10-12).
    const thin = !!byModel.get(id) && byModel.get(id)!.uniqueAnswers < MIN_MODEL_ANSWERS && failed > byModel.get(id)!.checks;
    const estimate = thin ? undefined : byModel.get(id);
    return {
      id,
      label: MODEL_LABELS[id],
      score: estimate ? Math.round(estimate.score) : null,
      margin: estimate ? Math.round(estimate.margin) : null,
      notChecked: !estimate && failed > 0,
      skipped: !estimate && lastScanSkipped.includes(id),
    };
  });
  return {
    score: overall && {
      value: Math.round(overall.score),
      tone: scoreTone(overall.score),
      label: CONFIDENCE_LABELS[overall.confidence],
      sentence: scoreSentence(overall.score),
      firstResults: overall.confidence === "early" && scannedDays <= 1,
      change: report.change && { direction: report.change.direction, text: changeText(report.change) },
      coverage: coverageText(models),
      details: methodPanel(
        {
          windowDays: SCORE_WINDOW_DAYS,
          label: CONFIDENCE_LABELS[overall.confidence],
          confidence: overall.confidence,
          margin: Math.round(overall.margin),
          checks: overall.checks,
          uniqueAnswers: overall.uniqueAnswers,
          models,
        },
        calibration,
      ),
    },
    models: models.map(({ id, label, score, notChecked, skipped }) => ({
      id,
      label,
      score,
      notChecked,
      skipped,
      change: pointsChange(report.modelChanges[id]),
      monthChange: pointsChange(report.modelMonthChanges?.[id]),
    })),
    scanNotice: scanNoticeText(report.models, lastScanFailures, report.questions.length, lastScanSkipped),
    trend: trendView({ history: report.history, nextScanAt, now }),
    opportunities: topOpportunities(opportunities),
    lastCheckedAt: report.lastCheckedAt?.toISOString() ?? null,
    scanCredits: report.questions.length * report.models.length,
    monthChange: pointsChange(report.monthChange),
    ownQuestions: ownQuestionsText(report.ownQuestions),
    ownChain: ownChainText(report.ownChain),
  };
}
