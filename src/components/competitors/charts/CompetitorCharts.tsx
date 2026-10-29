import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompetitorChartsView } from "@/modules/competitors";
import { ModelComparisonChart } from "./ModelComparisonChart";
import { ShareOfVoiceChart } from "./ShareOfVoiceChart";
import { VisibilityTrendChart } from "./VisibilityTrendChart";

// The Competitors page charts (2026-10-23): the trend under the leaderboard, then the share of AI picks and the per-AI
// comparison side by side.

export function VisibilityTrendCard({ charts, grow = false }: { charts: CompetitorChartsView; grow?: boolean }) {
  const more = charts.hidden > 0 ? `, ${charts.hidden} more in the list above` : "";
  // Only a drawn chart grows to fill its column; the "after your second scan" note stays short.
  const fill = grow && charts.timeline.length >= 2;
  return (
    <Card className={fill ? "flex-1" : undefined}>
      <CardHeader>
        <CardTitle className="text-base">Visibility over time</CardTitle>
        <CardDescription>You and your top competitors at each scan{more}.</CardDescription>
      </CardHeader>
      <CardContent className={fill ? "flex flex-1 flex-col" : undefined}>
        <VisibilityTrendChart view={charts} />
      </CardContent>
    </Card>
  );
}

export function ShareAndModelCards({ charts }: { charts: CompetitorChartsView }) {
  return (
    // Both cards take the row's height, and the donut sits in the middle of its card, so neither leaves a gap below.
    <div className="grid items-stretch gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your share of AI picks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center">
          <ShareOfVoiceChart view={charts} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By AI model</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-center">
          <ModelComparisonChart view={charts} />
        </CardContent>
      </Card>
    </div>
  );
}
