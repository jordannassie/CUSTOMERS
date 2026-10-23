"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { CompetitorChartsView } from "@/modules/competitors";
import { SeriesTooltip } from "./SeriesLegend";

type Slice = CompetitorChartsView["share"][number];

/** Of every answer that named you or a tracked competitor, the share that named each one. */
export function ShareOfVoiceChart({ view }: { view: CompetitorChartsView }) {
  const you = view.share.find((s) => s.isYou);
  if (view.mentions === 0 || !you) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="share-empty">
        AI has not named you or a tracked competitor yet. Shares show here after a scan where it does.
      </p>
    );
  }
  const config = Object.fromEntries(view.share.map((s) => [s.key, { label: s.name, color: s.color }])) satisfies ChartConfig;
  const slices = view.share.filter((s) => s.mentions > 0);
  return (
    <figure className="m-0 flex flex-col items-center gap-4 sm:flex-row sm:items-center" data-testid="share-of-voice-chart">
      <div className="relative size-40 shrink-0">
        <ChartContainer config={config} className="aspect-square size-40" aria-hidden="true">
          <PieChart>
            <ChartTooltip content={<SliceTooltip />} />
            <Pie
              data={slices}
              dataKey="mentions"
              nameKey="name"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={slices.length > 1 ? 1 : 0}
              stroke="var(--color-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{Math.round(you.share)}%</span>
          <span className="text-xs text-muted-foreground">yours</span>
        </div>
      </div>
      <figcaption className="w-full min-w-0 flex-1">
        <ul className="flex flex-col gap-2 text-sm">
          {view.share.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden="true" />
                <span className={s.isYou ? "truncate font-medium" : "truncate text-muted-foreground"}>
                  {s.name}
                  {s.isYou ? " (you)" : ""}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{Math.round(s.share)}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-text-hint">
          Out of {view.mentions} {view.mentions === 1 ? "time" : "times"} AI named one of these businesses in the last 30 days.
        </p>
      </figcaption>
    </figure>
  );
}

function SliceTooltip({ active, payload }: { active?: boolean; payload?: { payload: Slice }[] }) {
  const s = payload?.[0]?.payload;
  if (!active || !s) return null;
  return <SeriesTooltip title="Share of voice" rows={[{ ...s, value: Math.round(s.share) }]} unit="%" />;
}
