"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { CompetitorChartsView } from "@/modules/competitors";
import { SeriesLegend, SeriesTooltip } from "./SeriesLegend";

type Row = CompetitorChartsView["byModel"][number];

/** How often each AI recommends you and your top competitors, side by side per AI. */
export function ModelComparisonChart({ view }: { view: CompetitorChartsView }) {
  const { series, byModel } = view;
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.name, color: s.color }])) satisfies ChartConfig;
  const summary = byModel.map((m) => `${m.model}: ${series.map((s) => `${s.name} ${m[s.key] ?? "no checks"}`).join(", ")}`).join("; ");
  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="model-comparison-chart">
      <SeriesLegend series={series} />
      <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-hidden="true">
        <BarChart data={byModel} margin={{ top: 8, right: 16, bottom: 0, left: -20 }} barGap={2} barCategoryGap="24%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="model" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} width={48} />
          <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<ModelTooltip view={view} />} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          ))}
        </BarChart>
      </ChartContainer>
      <figcaption className="text-xs text-text-hint">
        <span className="sr-only">{summary}. </span>
        Share of each AI&apos;s answers in the last 30 days that recommended each business. An AI with no checks shows no bar.
      </figcaption>
    </figure>
  );
}

function ModelTooltip({ view, active, payload }: { view: CompetitorChartsView; active?: boolean; payload?: { payload: Row }[] }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return <SeriesTooltip title={String(row.model)} rows={view.series.map((s) => ({ ...s, value: (row[s.key] as number | null) ?? null }))} />;
}
