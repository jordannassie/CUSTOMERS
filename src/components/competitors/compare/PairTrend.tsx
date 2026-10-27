"use client";

import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { axisTicks, axisTop } from "@/lib/chart-scale";
import type { PairPoint } from "@/modules/competitors";


/** You and them at each scan (Compare): each scan's own share of answers naming you, your 30-day score dashed. */
export function Trend({ name, trend, color = "var(--chart-2)" }: { name: string; trend: PairPoint[]; color?: string }) {
  const top = axisTop(trend.flatMap((p) => [p.you, p.them, p.youRolling, p.themRolling]));
  const config = { you: { label: "You", color: "var(--chart-1)" }, them: { label: name, color } } satisfies ChartConfig;
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2" data-testid="pair-trend">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="text-sm font-medium text-foreground">Named at each scan</span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="17" y2="3" stroke="var(--chart-1)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          You
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="17" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="truncate">{name}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="17" y2="3" stroke="var(--chart-1)" strokeWidth="1.5" strokeDasharray="3 3" strokeOpacity="0.7" />
          </svg>
          Your 30-day score
        </span>
      </div>
      {trend.length < 2 ? (
        <p className="flex min-h-32 items-center rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground">
          The trend starts after your second scan.
        </p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-36 w-full" aria-hidden="true">
          <ComposedChart data={trend} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="pair-you-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval="preserveStartEnd" minTickGap={24} />
            <YAxis domain={[0, top]} ticks={axisTicks(top)} tickLine={false} axisLine={false} width={32} allowDataOverflow />
            <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<PairTooltip name={name} />} />
            <Area dataKey="you" type="monotone" fill="url(#pair-you-fill)" stroke="none" connectNulls isAnimationActive={false} tooltipType="none" />
            <Line dataKey="youRolling" type="monotone" stroke="var(--chart-1)" strokeWidth={1.5} strokeDasharray="5 5" strokeOpacity={0.7} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
            <Line dataKey="them" type="monotone" stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color, strokeWidth: 0 }} connectNulls isAnimationActive={false} />
            <Line dataKey="you" type="monotone" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: "var(--chart-1)" }} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ChartContainer>
      )}
      <figcaption className="sr-only">
        {trend.map((p) => `${p.label}: you ${p.you ?? "no checks"}, ${name} ${p.them ?? "no checks"}`).join("; ")}. Each point is the share of that scan&apos;s answers that named each of you.
      </figcaption>
    </figure>
  );
}

function PairTooltip({ name, active, payload }: { name: string; active?: boolean; payload?: { payload: PairPoint }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="min-w-40 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium">Scan on {p.label}</p>
      <p className="flex justify-between gap-4">
        <span className="font-medium text-primary">You</span>
        <span className="tabular-nums">{p.you ?? "No checks"}</span>
      </p>
      <p className="flex justify-between gap-4">
        <span className="truncate text-muted-foreground">{name}</span>
        <span className="tabular-nums">{p.them ?? "No checks"}</span>
      </p>
      {p.youRolling !== null && <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">Your 30-day score: {p.youRolling}</p>}
    </div>
  );
}
