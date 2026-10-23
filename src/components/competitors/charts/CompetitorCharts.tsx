import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompetitorChartsView } from "@/modules/competitors";
import { ModelComparisonChart } from "./ModelComparisonChart";
import { ShareOfVoiceChart } from "./ShareOfVoiceChart";
import { VisibilityTrendChart } from "./VisibilityTrendChart";

// The Competitors page charts (2026-10-23): the trend under the leaderboard, then the share of AI picks and the per-AI
// comparison side by side.

export function VisibilityTrendCard({ charts }: { charts: CompetitorChartsView }) {
  const more = charts.hidden > 0 ? `, ${charts.hidden} more in the list above` : "";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visibility over time</CardTitle>
        <CardDescription>You and your top competitors at each scan{more}.</CardDescription>
      </CardHeader>
      <CardContent>
        <VisibilityTrendChart view={charts} />
      </CardContent>
    </Card>
  );
}

export function ShareAndModelCards({ charts }: { charts: CompetitorChartsView }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your share of AI picks</CardTitle>
          <CardDescription>How often AI names you compared with your competitors.</CardDescription>
        </CardHeader>
        <CardContent>
          <ShareOfVoiceChart view={charts} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By AI model</CardTitle>
          <CardDescription>Which AI recommends you, and which recommends your competitors.</CardDescription>
        </CardHeader>
        <CardContent>
          <ModelComparisonChart view={charts} />
        </CardContent>
      </Card>
    </div>
  );
}
