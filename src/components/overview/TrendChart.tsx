"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { TrendView } from "@/modules/overview";

const config = { score: { label: "Visibility", color: "var(--primary)" } } satisfies ChartConfig;

/** Last 7 days: a sentence while there are fewer than 2 scans, then one joined point per scan day (DB-001). */
export function TrendChart({ trend }: { trend: TrendView }) {
  if (trend.summary) {
    return (
      <p className="text-sm text-muted-foreground tabular-nums" data-testid="trend-summary">
        {trend.summary}
      </p>
    );
  }

  const summary = `Visibility at each scan in the last 7 days: ${trend.points.map((p) => `${p.label} ${p.score}`).join(", ")}.`;
  return (
    <figure className="m-0" data-testid="trend-chart">
      <ChartContainer config={config} className="aspect-auto h-40 w-full" aria-hidden="true">
        <LineChart data={trend.points} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} width={48} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Line
            dataKey="score"
            type="monotone"
            stroke="var(--color-score)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-score)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
