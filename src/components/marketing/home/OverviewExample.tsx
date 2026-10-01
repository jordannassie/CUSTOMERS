import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelScores } from "@/components/overview/ModelScores";
import { ScoreSummary } from "@/components/overview/ScoreSummary";
import { TrendChart } from "@/components/overview/TrendChart";
import { MODEL_LABELS, type OverviewView } from "@/modules/overview";
import { ProductFrame } from "./ProductFrame";

const SCORE: React.ComponentProps<typeof ScoreSummary>["score"] = {
  value: 62,
  tone: "mid",
  label: "Good confidence",
  sentence: "AI recommended you in about 6 of 10 customer questions this month.",
  firstResults: false,
  change: { direction: "up", text: "Up 4 points on last week" },
};

// The 30-day score at each scan with its margin, as the app draws it (DB-002).
const TREND: OverviewView["trend"] = {
  points: [53, 54, 56, 55, 57, 58, 58, 60, 61, 62].map((score, i) => {
    const day = 2 + i * 3;
    return { date: `2026-09-${String(day).padStart(2, "0")}`, label: `Sep ${day}`, score, margin: 6, band: [score - 6, score + 6] };
  }),
  change: { direction: "up", text: "Up 9 points since Sep 2" },
  summary: null,
  caption: "Each dot is one scan. The shaded band is how far the score could be off.",
};

const MODELS: OverviewView["models"] = [
  { id: "openai", label: MODEL_LABELS.openai, score: 75, change: null },
  { id: "anthropic", label: MODEL_LABELS.anthropic, score: 58, change: null },
  { id: "perplexity", label: MODEL_LABELS.perplexity, score: 53, change: null },
];

/** The Overview screen (B-49) with the same layout and components as the app. */
export function OverviewExample() {
  return (
    <ProductFrame page="Overview" note="Scans every day">
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visibility score, last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            <ScoreSummary score={SCORE} />
            <TrendChart trend={TREND} heading="h4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score by AI</CardTitle>
          </CardHeader>
          <CardContent>
            <ModelScores models={MODELS} />
          </CardContent>
        </Card>
      </div>
    </ProductFrame>
  );
}
