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

// Daily scans, so the real chart has a point for every day.
const TREND: OverviewView["trend"] = [55, 57, 56, 58, 60, 61, 62].map((score, i) => ({
  date: `2026-09-${String(24 + i).padStart(2, "0")}`,
  score,
}));

const MODELS: OverviewView["models"] = [
  { id: "openai", label: MODEL_LABELS.openai, score: 75 },
  { id: "anthropic", label: MODEL_LABELS.anthropic, score: 58 },
  { id: "perplexity", label: MODEL_LABELS.perplexity, score: 53 },
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
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium">Last 7 days</h4>
              <TrendChart trend={TREND} />
            </div>
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
