import {
  SCORE_WINDOW_DAYS,
  type Change,
  type Confidence,
  type OwnQuestionsResult,
  type ProviderId,
  type ScoreReport,
} from "@/modules/scanning";
import { CALIBRATION, listNames, methodPanel, type Calibration, type MethodPanel } from "./method";
import { trendView, type TrendView } from "./trend";

// What the Overview shows (B-49, MVP_SPEC 5.6, 8.1). Pure, so every state is unit tested.

export const MODEL_LABELS: Record<ProviderId, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
};

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
  /** notChecked: no checks in the window and every check failed in the last scan, so "Couldn't be checked". */
  models: { id: ProviderId; label: string; score: number | null; notChecked?: boolean; change: PointsChange | null }[];
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

/** The user's own questions, shown apart from the score they are not part of (BUG-129). */
export function ownQuestionsText(result: OwnQuestionsResult | null): string | null {
  if (!result) return null;
  const answers = `${result.answers} ${result.answers === 1 ? "answer" : "answers"}`;
  return `Your own questions: named in ${result.named} of ${answers}. Not part of the score.`;
}

/** Failed checks per AI in the latest finished scan. */
export type ScanFailures = Partial<Record<ProviderId, number>>;

/** visibility_runs.failed_by_provider ({"anthropic": {"failed": 12, "reason": "..."}}) as counts per AI. */
export function scanFailuresFrom(value: unknown): ScanFailures | null {
  if (!value || typeof value !== "object") return null;
  const failures: ScanFailures = {};
  for (const id of Object.keys(MODEL_LABELS) as ProviderId[]) {
    const failed = (value as Record<string, { failed?: unknown } | undefined>)[id]?.failed;
    if (typeof failed === "number" && failed > 0) failures[id] = failed;
  }
  return failures;
}

/** Says which AIs the score rests on when a chosen one has no checks. */
export function coverageText(models: { label: string; score: number | null; notChecked: boolean }[]): string | null {
  const scored = models.filter((m) => m.score !== null).map((m) => m.label);
  const missing = models.filter((m) => m.score === null);
  if (missing.length === 0 || scored.length === 0) return null;
  const failed = missing.filter((m) => m.notChecked).map((m) => m.label);
  const waiting = missing.filter((m) => !m.notChecked).map((m) => m.label);
  const parts = [`Based on ${listNames(scored)}.`];
  if (failed.length > 0) parts.push(`${listNames(failed)} couldn't be checked.`);
  if (waiting.length > 0) parts.push(`${listNames(waiting)} ${waiting.length === 1 ? "has" : "have"} no checks yet.`);
  return parts.join(" ");
}

export function scanNoticeText(models: ProviderId[], failures: ScanFailures | null, questions: number): string | null {
  const failed = models.filter((id) => (failures?.[id] ?? 0) > 0);
  if (failed.length === 0) return null;
  const all = failed.filter((id) => (failures?.[id] ?? 0) >= questions).map((id) => MODEL_LABELS[id]);
  const some = failed.filter((id) => (failures?.[id] ?? 0) < questions).map((id) => MODEL_LABELS[id]);
  const parts = [
    all.length > 0 ? `${listNames(all)} couldn't be checked` : null,
    some.length > 0 ? `${listNames(some)} couldn't answer some questions` : null,
  ].filter(Boolean);
  return `In the last scan, ${parts.join(", and ")}. We'll try again in the next scan. Failed checks are never charged.`;
}

/** Most important first, then newest; the Overview shows three. */
export function topOpportunities(opportunities: Opportunity[], count = 3): OverviewView["opportunities"] {
  return [...opportunities]
    .sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || b.createdAt.localeCompare(a.createdAt))
    .slice(0, count)
    .map(({ id, title, impact }) => ({ id, title, impact }));
}

export function overviewView(
  report: ScoreReport,
  opportunities: Opportunity[],
  options: { nextScanAt?: Date | null; now?: Date; calibration?: Calibration | null; lastScanFailures?: ScanFailures | null } = {},
): OverviewView {
  const { nextScanAt = null, now = new Date(), calibration = CALIBRATION, lastScanFailures = null } = options;
  const { overall } = report;
  const scannedDays = report.trend.filter((p) => p.checks > 0).length;
  const byModel = new Map(report.byModel.map((m) => [m.model, m.estimate]));
  const models = report.models.map((id) => {
    const estimate = byModel.get(id);
    return {
      id,
      label: MODEL_LABELS[id],
      score: estimate ? Math.round(estimate.score) : null,
      margin: estimate ? Math.round(estimate.margin) : null,
      notChecked: !estimate && (lastScanFailures?.[id] ?? 0) > 0,
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
          margin: Math.round(overall.margin),
          checks: overall.checks,
          uniqueAnswers: overall.uniqueAnswers,
          models,
        },
        calibration,
      ),
    },
    models: models.map(({ id, label, score, notChecked }) => ({
      id,
      label,
      score,
      notChecked,
      change: pointsChange(report.modelChanges[id]),
    })),
    scanNotice: scanNoticeText(report.models, lastScanFailures, report.questions.length),
    trend: trendView({ history: report.history, nextScanAt, now }),
    opportunities: topOpportunities(opportunities),
    lastCheckedAt: report.lastCheckedAt?.toISOString() ?? null,
    scanCredits: report.questions.length * report.models.length,
    monthChange: pointsChange(report.monthChange),
    ownQuestions: ownQuestionsText(report.ownQuestions),
  };
}
