"use client";

import { useState } from "react";
import { cn } from "cn";
import { LineAreaChart, type LineSeries } from "@/components/charts";
import type { OverviewCompete } from "@/modules/competitors/overview";
import { colorAt } from "@/lib/series-colors";
import { FirstScanBars } from "../FirstScanBars";

type Row = OverviewCompete["timeline"][number];
type LineInfo = OverviewCompete["lines"][number];

/**
 * "Visibility at each scan" in the Check-in look (C-Overview): each scan's share of answers naming each business, you
 * in brand blue with the gradient under your line, the leader coral, the rest grey. Each name in the legend hides or
 * shows its line. One scan shows its values as bars; fewer says when the line starts.
 */
export function ScanLines({
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
  nextScan?: string | null;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
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
    const text =
      earlier && days
        ? `${timeline.length === 1 ? "Only one scan" : "No scans"} in the last ${days} days. Pick a longer range to see the trend.`
        : "The chart starts after your second scan. Each scan adds a point.";
    return (
      <p className="flex min-h-40 items-center rounded-lg border border-dashed border-border-strong px-4 text-sm text-muted-foreground" data-testid="trend-waiting">
        {text}
      </p>
    );
  }

  const toggle = (key: string) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(key)) next.delete(key);
      else if (lines.length - next.size > 1) next.add(key);
      return next;
    });
  const value = (v: number | string | null) => (typeof v === "number" ? v : null);
  const series: LineSeries[] = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => !hidden.has(l.key))
    .map(({ l, i }) => ({ id: l.key, name: l.isYou ? "You" : l.name, values: timeline.map((p) => value(p[l.key])), color: colorAt(i), emphasis: l.isYou }));
  // Your 30-day score at each scan, the steadier line behind your per-scan one.
  if (!hidden.has("s0") && timeline.some((p) => p.rolling !== null)) {
    series.push({ id: "rolling", name: "Your 30-day score", values: timeline.map((p) => p.rolling), color: "var(--cd-primary-lighter)", dashed: true });
  }
  const summary = timeline.map((p) => `${p.label}: ${lines.map((l) => `${l.isYou ? "you" : l.name} ${p[l.key] ?? "no checks"}`).join(", ")}`).join("; ");

  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="scan-chart">
      <ul className="-ml-1 flex flex-wrap gap-1" aria-label="Businesses on the chart">
        {lines.map((l, i) => {
          const off = hidden.has(l.key);
          return (
            <li key={l.key}>
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(l.key)}
                className={cn(
                  "flex min-h-9 max-w-56 items-center gap-1.5 rounded-full border px-2.5 text-[13px] transition-colors pointer-coarse:min-h-11",
                  off ? "border-dashed border-border-strong text-muted-foreground" : "border-transparent text-ink-2 hover:bg-muted",
                )}
                data-testid="scan-line"
              >
                <span className="h-[3px] w-3.5 shrink-0 rounded-full" style={{ background: off ? "var(--cd-border-strong)" : colorAt(i) }} aria-hidden="true" />
                {/* The latest value is at the end of each line on the chart, so the legend shows names only. */}
                <span className={cn("truncate", l.isYou && "font-semibold text-foreground")}>{l.isYou ? "You" : l.name}</span>
              </button>
            </li>
          );
        })}
        <li className="flex min-h-9 items-center gap-1.5 px-2.5 text-[13px] text-ink-2">
          <span className="w-3.5 shrink-0 border-t-[3px] border-dashed border-brand-lighter" aria-hidden="true" />
          Your 30-day score
        </li>
      </ul>
      <LineAreaChart labels={timeline.map((p) => p.label)} series={series} showLegend={false} ariaLabel={`Visibility at each scan. ${summary}`} tooltipTitle={(l) => `Scan on ${l}`} />
    </figure>
  );
}
