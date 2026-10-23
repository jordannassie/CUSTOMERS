"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { CompetitorChartsView } from "@/modules/competitors";
import { SeriesLegend, SeriesTooltip } from "./SeriesLegend";

type Row = CompetitorChartsView["timeline"][number];

/** You and your top competitors at each scan: the 30-day score as it stood then, so each line ends at the leaderboard. */
export function VisibilityTrendChart({ view }: { view: CompetitorChartsView }) {
  const { series, timeline } = view;
  const latest = timeline.at(-1);
  if (timeline.length < 2 || !latest) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="trend-waiting">
        The lines start after your second scan. Each scan adds a point for you and each competitor.
      </p>
    );
  }
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.name, color: s.color }])) satisfies ChartConfig;
  const summary = series.map((s) => `${s.name} ${latest[s.key] ?? "no checks"}`).join(", ");
  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="competitor-trend-chart">
      <SeriesLegend series={series} />
      <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-hidden="true">
        <LineChart data={timeline} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} width={48} />
          <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<TrendTooltip view={view} />} />
          {/* Competitors first, so your line is drawn on top. */}
          {[...series].reverse().map((s) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.name}
              type="monotone"
              stroke={s.color}
              strokeWidth={s.isYou ? 2.5 : 2}
              dot={timeline.length <= 20 ? { r: s.isYou ? 3.5 : 3, fill: s.color, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: s.color, stroke: "var(--color-surface)", strokeWidth: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <figcaption className="text-xs text-text-hint">
        <span className="sr-only">Latest scores: {summary}. </span>
        How often AI recommended each business over the 30 days before each scan.
      </figcaption>
    </figure>
  );
}

function TrendTooltip({ view, active, payload }: { view: CompetitorChartsView; active?: boolean; payload?: { payload: Row }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const rows = view.series.map((s) => ({ ...s, value: (row[s.key] as number | null) ?? null }));
  return <SeriesTooltip title={`Scan on ${row.label}`} rows={rows} />;
}
