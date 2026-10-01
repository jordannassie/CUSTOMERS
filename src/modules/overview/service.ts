import { SCORE_WINDOW_DAYS, type Change, type Confidence, type ProviderId, type ScoreReport } from "@/modules/scanning";
import { CALIBRATION, methodPanel, type Calibration, type MethodPanel } from "./method";
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

export type OverviewView = {
  score: {
    value: number;
    tone: Tone;
    label: string;
    sentence: string;
    /** "First results. Accuracy improves with every scan." while there is one scan's worth of data. */
    firstResults: boolean;
    change: { direction: Change["direction"]; text: string } | null;
    details: MethodPanel;
  } | null;
  models: { id: ProviderId; label: string; score: number | null }[];
  trend: TrendView;
  opportunities: Pick<Opportunity, "id" | "title" | "impact">[];
  lastCheckedAt: string | null;
  /** One credit per answer: active questions times chosen models. */
  scanCredits: number;
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
  options: { nextScanAt?: Date | null; now?: Date; calibration?: Calibration | null } = {},
): OverviewView {
  const { nextScanAt = null, now = new Date(), calibration = CALIBRATION } = options;
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
    models: models.map(({ id, label, score }) => ({ id, label, score })),
    trend: trendView({ trend: report.trend, scans: report.scans, nextScanAt, now }),
    opportunities: topOpportunities(opportunities),
    lastCheckedAt: report.lastCheckedAt?.toISOString() ?? null,
    scanCredits: report.questions.length * report.models.length,
  };
}
