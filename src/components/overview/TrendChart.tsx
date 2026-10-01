"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { cn } from "cn";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { TrendView } from "@/modules/overview";

const config = {
  score: { label: "Score", color: "var(--primary)" },
  band: { label: "Margin of error", color: "var(--primary)" },
} satisfies ChartConfig;

// Past this many scans (daily scans) the dots crowd the line, so only the hovered one shows.
const MAX_DOTS = 30;

type Point = TrendView["points"][number];

/** Score at each scan over 90 days with its margin as a band (DB-002); a sentence under 2 scans (DB-001). */
export function TrendChart({ trend, heading: Heading = "h2" }: { trend: TrendView; heading?: "h2" | "h3" }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading className="text-sm font-medium">Score at each scan</Heading>
        {trend.change && (
          <span
            data-testid="trend-change"
            className={cn(
              "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium",
              trend.change.direction === "up" ? "bg-good-bg text-good-text" : "bg-low-bg text-low-text",
            )}
          >
            {trend.change.direction === "up" ? (
              <ArrowUp className="size-3.5" aria-hidden="true" />
            ) : (
              <ArrowDown className="size-3.5" aria-hidden="true" />
            )}
            {trend.change.text}
          </span>
        )}
      </div>
      {trend.summary ? (
        <p className="text-sm text-muted-foreground tabular-nums" data-testid="trend-summary">
          {trend.summary}
        </p>
      ) : (
        <Chart trend={trend} />
      )}
    </div>
  );
}

function Chart({ trend }: { trend: TrendView }) {
  const summary = `Visibility score at each scan: ${trend.points.map((p) => `${p.label} ${p.score}`).join(", ")}.`;
  return (
    <figure className="m-0 flex flex-col gap-2" data-testid="trend-chart">
      <ChartContainer config={config} className="aspect-auto h-44 w-full" aria-hidden="true">
        <ComposedChart data={trend.points} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} width={48} />
          <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<PointTooltip />} />
          <Area dataKey="band" stroke="none" fill="var(--color-band)" fillOpacity={0.1} isAnimationActive={false} activeDot={false} />
          <Line
            dataKey="score"
            type="monotone"
            stroke="var(--color-score)"
            strokeWidth={2}
            dot={trend.points.length <= MAX_DOTS ? { r: 3, fill: "var(--color-score)" } : false}
            activeDot={{ r: 4, fill: "var(--color-score)", stroke: "var(--color-surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
      <figcaption className="text-xs text-text-hint">
        <span className="sr-only">{summary} </span>
        {trend.caption}
      </figcaption>
    </figure>
  );
}

function PointTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium">{point.label}</p>
      <p className="text-muted-foreground tabular-nums">
        Score {point.score}, plus or minus {point.margin}
      </p>
    </div>
  );
}
