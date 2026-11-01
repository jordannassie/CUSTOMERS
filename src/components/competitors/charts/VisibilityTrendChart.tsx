"use client";

import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { axisTicks, axisTop } from "@/lib/chart-scale";
import type { CompetitorChartsView } from "@/modules/competitors";
import { FirstScanBars } from "@/components/overview/FirstScanBars";
import { SeriesLegend, SeriesTooltip } from "./SeriesLegend";

type Row = CompetitorChartsView["timeline"][number];

/**
 * You and your top competitors at each scan (redesign brief): each line is that scan's own share of answers naming the
 * business, so it moves with real answers; the dashed blue line is your 30-day score, the number the leaderboard shows.
 * The Y axis fits the data, so 5 to 20 isn't drawn flat on a 0 to 100 scale.
 */
export function VisibilityTrendChart({ view, nextScan = null }: { view: CompetitorChartsView; nextScan?: string | null }) {
  const { series, timeline } = view;
  const latest = timeline.at(-1);
  // One scan day: its values as bars in each business's color, so the card shows a real result from the first scan.
  if (timeline.length === 1 && latest) {
    const bars = series.map((s) => ({ key: s.key, name: s.name, isYou: s.isYou, value: latest[s.key] as number | null, color: s.color }));
    const footnote = `Each scan adds a point. The lines start after your next scan${nextScan ? ` on ${nextScan}` : ""}.`;
    return <FirstScanBars bars={bars} label={latest.label} first={view.firstScan} footnote={footnote} />;
  }
  if (timeline.length < 2 || !latest) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="trend-waiting">
        The lines start after your second scan. Each scan adds a point for you and each competitor.
      </p>
    );
  }
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.name, color: s.color }])) satisfies ChartConfig;
  const summary = series.map((s) => `${s.name} ${latest[s.key] ?? "no checks"}`).join(", ");
  const top = axisTop(timeline.flatMap((row) => series.flatMap((s) => [row[s.key] as number | null, row[`r${s.key}`] as number | null])));
  return (
    // Grows with its card, so it fills the space beside a long "Also recommended" list (never under 224px).
    <figure className="m-0 flex h-full flex-col gap-3" data-testid="competitor-trend-chart">
      <SeriesLegend series={series} />
      <ChartContainer config={config} className="aspect-auto h-64 w-full" aria-hidden="true">
        <ComposedChart data={timeline} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="trend-you-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[0, top]} ticks={axisTicks(top)} tickLine={false} axisLine={false} width={48} allowDataOverflow />
          <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<TrendTooltip view={view} />} />
          {/* A soft fill under your line only: you are the one series that matters here. */}
          <Area dataKey="s0" type="monotone" fill="url(#trend-you-fill)" stroke="none" connectNulls isAnimationActive={false} tooltipType="none" />
          {/* Your 30-day score as it stood at each scan: the reference the per-scan points move around. */}
          <Line
            dataKey={`r${series[0].key}`}
            name="Your 30-day score"
            type="monotone"
            stroke="var(--chart-1)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            strokeOpacity={0.7}
            dot={false}
            activeDot={false}
            connectNulls
            isAnimationActive={false}
            legendType="none"
          />
          {/* Competitors first, so your line is drawn on top; each has its own color and its name in the legend. */}
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
        </ComposedChart>
      </ChartContainer>
      <figcaption className="text-xs text-text-hint">
        <span className="sr-only">Latest scores: {summary}. </span>
        Each point is the share of that scan&apos;s answers that named the business. Dashed: your 30-day score.
      </figcaption>
    </figure>
  );
}

function TrendTooltip({ view, active, payload }: { view: CompetitorChartsView; active?: boolean; payload?: { payload: Row }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const rows = view.series.map((s) => ({ ...s, value: (row[s.key] as number | null) ?? null }));
  const rolling = row[`r${view.series[0].key}`];
  return <SeriesTooltip title={`Scan on ${row.label}`} rows={rows} footer={typeof rolling === "number" ? `Your 30-day score: ${rolling}` : undefined} />;
}
