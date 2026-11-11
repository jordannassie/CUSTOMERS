"use client";

import { useId, useState } from "react";
import { cn } from "cn";
import { CHART, knownRuns, niceScale, smoothPath, spreadLabels } from "./chart-kit";
import { ChartTooltipCard, Legend } from "./Legend";
import { ScrollX } from "./ScrollX";
import { useChartWidth } from "./use-chart-width";

export type LineSeries = {
  id: string;
  name: string;
  /** One value per x label; null where that business was not checked (the line breaks there). */
  values: (number | null)[];
  color: string;
  /** The current business: a thicker line, the gradient area, its name in bold. */
  emphasis?: boolean;
  /** A reference line (the 30-day score): thinner, dashed, no end label, not drawn in. */
  dashed?: boolean;
};

type Props = {
  /** X labels, one per scan, oldest first. */
  labels: string[];
  series: LineSeries[];
  /** Written summary for screen readers. */
  ariaLabel: string;
  /** Top of the y axis; rounded up from the data when left out. */
  yMax?: number;
  format?: (n: number) => string;
  /** The tooltip's heading for a column, for example "Oct 17 scan". */
  tooltipTitle?: (label: string) => string;
  showLegend?: boolean;
  className?: string;
};

// Fixed height; the width is the chart's real width (useChartWidth), so a wider card gives a wider chart, not a taller
// one. 760 is the design width used before the first measure.
const H = 250;
const LEFT = 44;
const TOP = 16;
const BOTTOM = 222;

// Check-in line chart (C-Overview): smooth lines, a brand gradient under the current business, each line's last value
// at its end, and a hover column with every business sorted by value. Hand-built SVG: Recharts has no end labels that
// avoid each other, and the column hover is the mockup's.
export function LineAreaChart({ labels, series, ariaLabel, yMax, format = (n) => String(Math.round(n)), tooltipTitle, showLegend = true, className }: Props) {
  const gradientId = useId().replace(/:/g, "");
  const [hover, setHover] = useState(-1);
  const [box, W] = useChartWidth<HTMLDivElement>(760, 560);
  const RIGHT = W - 70;
  const n = labels.length;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const { top, ticks } = niceScale(yMax ?? Math.max(0, ...all));
  const x = (i: number) => (n > 1 ? LEFT + (i * (RIGHT - LEFT)) / (n - 1) : (LEFT + RIGHT) / 2);
  const y = (v: number) => BOTTOM - (v / top) * (BOTTOM - TOP);
  const colW = n > 1 ? (RIGHT - LEFT) / (n - 1) : RIGHT - LEFT;

  // Emphasised series draw last, so the current business sits on top.
  const ordered = [...series].sort((a, b) => Number(!!a.emphasis) - Number(!!b.emphasis));
  const ends = ordered.map((s) => {
    const last = [...s.values.keys()].reverse().find((i) => s.values[i] !== null);
    return last === undefined ? null : { i: last, v: s.values[last] as number };
  });
  const endYs = spreadLabels(ends.map((e, k) => (e && !ordered[k].dashed ? y(e.v) : BOTTOM + 40)), 15, TOP, BOTTOM + 40);
  const you = ordered.find((s) => s.emphasis);
  const youRuns = you ? knownRuns(you.values).filter((r) => r.length > 1) : [];

  const tipRows =
    hover >= 0
      ? series
          .filter((s) => s.values[hover] !== null)
          .sort((a, b) => (b.values[hover] as number) - (a.values[hover] as number))
          .map((s) => ({ label: s.name, value: format(s.values[hover] as number), color: s.color }))
      : [];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showLegend && series.length > 1 && (
        <Legend shape="line" items={series.map((s) => ({ label: s.name, color: s.color, strong: s.emphasis }))} />
      )}
      <ScrollX>
        <div ref={box} className="relative min-w-[560px]" onMouseLeave={() => setHover(-1)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={ariaLabel}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={CHART.you} stopOpacity="0.32" />
                <stop offset="1" stopColor={CHART.you} stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={LEFT} x2={RIGHT} y1={y(t)} y2={y(t)} stroke={CHART.grid} />
                <text x={LEFT - 10} y={y(t) + 4} fill={CHART.axis} fontSize="12" textAnchor="end">
                  {t}
                </text>
              </g>
            ))}
            {labels.map((l, i) => (
              <text key={i} x={x(i)} y={H - 8} fill={CHART.axis} fontSize="12" textAnchor="middle">
                {l}
              </text>
            ))}
            {hover >= 0 && <rect x={x(hover) - 1} y={TOP} width="2" height={BOTTOM - TOP} fill={CHART.borderStrong} />}
            {youRuns.map((run, k) => (
              <path
                key={k}
                d={`${smoothPath(run.map(([i, v]) => [x(i), y(v)] as const))} L${x(run[run.length - 1][0])},${BOTTOM} L${x(run[0][0])},${BOTTOM} Z`}
                fill={`url(#${gradientId})`}
                className="animate-fade [animation-delay:1s]"
              />
            ))}
            {ordered.map((s, k) => (
              <g key={s.id} data-testid="chart-line" data-series={s.id}>
                {knownRuns(s.values).map((run, r) =>
                  run.length > 1 ? (
                    <path
                      key={r}
                      d={smoothPath(run.map(([i, v]) => [x(i), y(v)] as const))}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={s.dashed ? 2 : s.emphasis ? 4 : 2.5}
                      strokeLinecap="round"
                      pathLength={s.dashed ? undefined : 1}
                      strokeDasharray={s.dashed ? "5 5" : 1}
                      className={s.dashed ? "animate-fade" : "animate-draw"}
                      style={{ animationDelay: `${0.3 + k * 0.1}s` }}
                    />
                  ) : (
                    <circle key={r} cx={x(run[0][0])} cy={y(run[0][1])} r="5" fill={s.color} stroke={CHART.surface} strokeWidth="2" />
                  ),
                )}
                {ends[k] && !s.dashed && (
                  <>
                    <circle cx={x(ends[k]!.i)} cy={y(ends[k]!.v)} r="5" fill={s.color} stroke={CHART.surface} strokeWidth="2" />
                    <text x={RIGHT + 12} y={endYs[k] + 4} fill={CHART.ink} fontSize="13" fontWeight={s.emphasis ? 700 : 600}>
                      {format(ends[k]!.v)}
                    </text>
                  </>
                )}
              </g>
            ))}
            {labels.map((_, i) => (
              <rect
                key={i}
                x={x(i) - colW / 2}
                y={TOP - 10}
                width={colW}
                height={BOTTOM - TOP + 20}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(i)}
              />
            ))}
          </svg>
          {hover >= 0 && tipRows.length > 0 && (
            <ChartTooltipCard
              title={tooltipTitle ? tooltipTitle(labels[hover]) : labels[hover]}
              rows={tipRows}
              className="absolute top-1"
              style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) > W * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
            />
          )}
        </div>
      </ScrollX>
    </div>
  );
}
