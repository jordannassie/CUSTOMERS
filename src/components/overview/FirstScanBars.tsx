"use client";

import { cn } from "cn";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { axisTicks, axisTop } from "@/lib/chart-scale";

/** One business on the one scan day: `value` is the share of that scan's answers naming it, null without checks. */
export type ScanBar = { key: string; name: string; isYou: boolean; value: number | null; color: string };

/** A name under its column on up to two lines of at most `width` characters. */
function nameLines(name: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of name.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= width || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 2).map((l) => (l.length > width ? `${l.slice(0, width - 1)}…` : l));
  if (lines.length > 2) shown[1] = `${shown[1].slice(0, width - 1)}…`;
  return shown;
}

function NameTick({
  x,
  y,
  payload,
  width,
  visibleTicksCount,
  youKey,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  width?: number | string;
  visibleTicksCount?: number;
  youKey: string;
}) {
  const name = payload?.value ?? "";
  const you = name === youKey;
  // Each column's share of the axis, at about 6.5px a character for 12px text, so names never run into each other.
  const column = Number(width) / Math.max(1, visibleTicksCount ?? 1);
  const chars = Number.isFinite(column) ? Math.max(4, Math.min(16, Math.floor(column / 6.5))) : 13;
  return (
    <text x={Number(x)} y={Number(y) + 4} textAnchor="middle" className={you ? "fill-primary text-xs font-semibold" : "fill-muted-foreground text-xs"}>
      {nameLines(name, chars).map((line, i) => (
        <tspan key={i} x={Number(x)} dy={i === 0 ? "0.71em" : "1.2em"}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * A per-scan chart with one scan day so far (Overview, Competitors, Compare): that scan's share of answers naming each
 * business as columns, in the colors the lines will use from the next scan day (you in blue), on the same axes as the
 * line charts. Real values only, no made-up trend. `label` is the scan's day, "Oct 30".
 */
export function FirstScanBars({
  bars,
  label,
  first,
  footnote,
  height = "h-64",
}: {
  bars: ScanBar[];
  label: string;
  first: boolean;
  footnote: string;
  /** The chart's height class, the same as the line chart it stands in for. */
  height?: string;
}) {
  const data = bars.map((b) => ({ key: b.key, name: b.isYou ? "You" : b.name, value: b.value ?? 0, missing: b.value === null, color: b.color }));
  const top = axisTop(data.map((d) => d.value));
  const config = { value: { label: "Share of answers" } } satisfies ChartConfig;
  return (
    <figure className="m-0 flex flex-col gap-3" data-testid="scan-chart-first">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{first ? "First scan" : "Scan"}</span>, {label}
      </p>
      <ChartContainer config={config} className={cn("aspect-auto w-full", height)} aria-hidden="true">
        <BarChart data={data} margin={{ top: 20, right: 12, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={40} tick={<NameTick youKey="You" />} />
          <YAxis domain={[0, top]} ticks={axisTicks(top)} tickLine={false} axisLine={false} width={32} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={56} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
            <LabelList
              dataKey="value"
              content={({ x, y, width, index }) => {
                const d = data[index ?? 0];
                return (
                  <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" className="fill-foreground text-xs font-medium tabular-nums">
                    {d.missing ? "No checks" : `${d.value}%`}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <ul className="sr-only" data-testid="first-scan-values">
        {data.map((d) => (
          <li key={d.key} data-testid="first-scan-bar">
            {d.name}: {d.missing ? "no checks" : `${d.value}%`}
          </li>
        ))}
      </ul>
      <figcaption className="text-xs text-muted-foreground">{footnote}</figcaption>
    </figure>
  );
}
