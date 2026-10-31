"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { cn } from "cn";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { axisTicks, axisTop } from "@/lib/chart-scale";
import type { OverviewCompete } from "@/modules/competitors/overview";
import { colorAt } from "@/lib/series-colors";
import { FirstScanBars } from "./FirstScanBars";

type Row = OverviewCompete["timeline"][number];
type LineInfo = OverviewCompete["lines"][number];

/**
 * "Visibility at each scan" (dashboard redesign): each scan's own share of answers naming each business, you in blue
 * and every competitor in its own color, with your 30-day score dashed. The legend names every line with its latest
 * value; hovering one brings its line forward, clicking one hides or shows it. The Y axis fits the data.
 */
export function ScanChart({
  timeline,
  lines,
  days,
  earlier = false,
  nextScan = null,
}: {
  timeline: Row[];
  lines: LineInfo[];
  days?: number;
  earlier?: boolean;
  /** The next scheduled scan's day ("Nov 5"), for the one-scan view's note. */
  nextScan?: string | null;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  // One scan day: its values as bars, so the card shows a real result from the first scan (a line needs two days).
  if (timeline.length === 1 && lines.length > 0) {
    const footnote =
      earlier && days
        ? `Only one scan in the last ${days} days. Pick a longer range to see the trend.`
        : `Each scan adds a point. Your trend line starts after your next scan${nextScan ? ` on ${nextScan}` : ""}.`;
    const point = timeline[0];
    const bars = lines.map((l, i) => ({ key: l.key, name: l.name, isYou: l.isYou, value: point[l.key] as number | null, color: colorAt(i) }));
    return <FirstScanBars bars={bars} label={point.label} first={!earlier} footnote={footnote} />;
  }
  if (timeline.length < 2) {
    // Scans before the range: a longer range draws the trend, so waiting for a second scan is the wrong advice.
    const text =
      earlier && days
        ? `${timeline.length === 1 ? "Only one scan" : "No scans"} in the last ${days} days. Pick a longer range to see the trend.`
        : "The chart starts after your second scan. Each scan adds a point.";
    return (
      <p className="flex min-h-40 items-center rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground" data-testid="trend-waiting">
        {text}
      </p>
    );
  }
  const shown = lines.filter((l) => !hidden.has(l.key));
  const top = axisTop(timeline.flatMap((p) => [...shown.map((l) => p[l.key] as number | null), p.rolling]));
  const config = Object.fromEntries(lines.map((l, i) => [l.key, { label: l.name, color: colorAt(i) }])) satisfies ChartConfig;
  const opacity = (key: string) => (focus && focus !== key ? 0.18 : 1);
  const toggle = (key: string) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(key)) next.delete(key);
      else if (lines.length - next.size > 1) next.add(key);
      return next;
    });

  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="scan-chart">
      <ul className="-ml-2 flex flex-wrap gap-0.5" aria-label="Businesses on the chart">
        {lines.map((l, i) => {
          const off = hidden.has(l.key);
          return (
            <li key={l.key}>
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(l.key)}
                onMouseEnter={() => setFocus(l.key)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(l.key)}
                onBlur={() => setFocus(null)}
                className={cn(
                  "flex h-7 max-w-56 items-center gap-1.5 rounded-sm border px-2 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  off ? "border-dashed border-border text-text-hint" : "border-transparent text-muted-foreground hover:bg-muted",
                )}
                data-testid="scan-line"
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: off ? "var(--border)" : colorAt(i) }} aria-hidden="true" />
                <span className={cn("truncate", l.isYou && "font-semibold text-primary")}>{l.isYou ? "You" : l.name}</span>
                <span className="font-semibold tabular-nums text-foreground">{l.latest ?? "None"}</span>
              </button>
            </li>
          );
        })}
        <li className="flex h-7 items-center gap-1.5 px-2 text-xs text-muted-foreground">
          <svg width="18" height="6" aria-hidden="true">
            <line x1="1" y1="3" x2="17" y2="3" stroke="var(--chart-1)" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
          Your 30-day score
        </li>
      </ul>
      <ChartContainer config={config} className="aspect-auto h-64 w-full" aria-hidden="true">
        <ComposedChart data={timeline} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="overview-you-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
          <YAxis domain={[0, top]} ticks={axisTicks(top)} tickLine={false} axisLine={false} width={32} allowDataOverflow />
          <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<Tip lines={shown} all={lines} />} />
          {!hidden.has("s0") && <Area dataKey="s0" type="monotone" fill="url(#overview-you-fill)" stroke="none" connectNulls isAnimationActive={false} tooltipType="none" fillOpacity={opacity("s0")} />}
          <Line dataKey="rolling" type="monotone" stroke="var(--chart-1)" strokeWidth={1.5} strokeDasharray="5 5" strokeOpacity={0.6 * opacity("s0")} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
          {/* Competitors first, so your line is drawn on top. */}
          {[...lines].reverse().map((l) => {
            const i = lines.indexOf(l);
            if (hidden.has(l.key)) return null;
            return (
              <Line
                key={l.key}
                dataKey={l.key}
                type="monotone"
                stroke={colorAt(i)}
                strokeWidth={l.isYou ? 2.75 : 2}
                strokeOpacity={opacity(l.key)}
                dot={{ r: l.isYou ? 3.5 : 2.5, fill: colorAt(i), strokeWidth: 0, fillOpacity: opacity(l.key) }}
                activeDot={{ r: 5, fill: colorAt(i), stroke: "var(--card)", strokeWidth: 2 }}
                connectNulls
                isAnimationActive={false}
              />
            );
          })}
        </ComposedChart>
      </ChartContainer>
      <figcaption className="sr-only">
        {timeline.map((p) => `${p.label}: ${lines.map((l) => `${l.isYou ? "you" : l.name} ${p[l.key] ?? "no checks"}`).join(", ")}`).join("; ")}
      </figcaption>
    </figure>
  );
}

function Tip({ lines, all, active, payload }: { lines: LineInfo[]; all: LineInfo[]; active?: boolean; payload?: { payload: Row }[] }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const rows = [...lines].sort((a, b) => ((p[b.key] as number | null) ?? -1) - ((p[a.key] as number | null) ?? -1));
  return (
    <div className="min-w-48 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium">Scan on {p.label}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((l) => (
          <li key={l.key} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: colorAt(all.indexOf(l)) }} aria-hidden="true" />
              <span className={cn("truncate", l.isYou ? "font-medium text-primary" : "text-muted-foreground")}>{l.isYou ? "You" : l.name}</span>
            </span>
            <span className="tabular-nums">{(p[l.key] as number | null) ?? "No checks"}</span>
          </li>
        ))}
      </ul>
      {p.rolling !== null && <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">Your 30-day score: {p.rolling}</p>}
    </div>
  );
}
