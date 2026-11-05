"use client";

import { Cell, LabelList, ReferenceArea, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { CHART } from "./chart-kit";
import { ChartTooltipCard } from "./Legend";
import { useReducedMotion } from "./use-reduced-motion";

export type Bubble = {
  name: string;
  /** Google rating, 1 to 5. */
  x: number;
  /** AI visibility, 0 to 100. */
  y: number;
  /** Review count: the bubble's area. */
  size: number;
  color: string;
  emphasis?: boolean;
};

type Props = {
  points: Bubble[];
  ariaLabel: string;
  xLabel?: string;
  yLabel?: string;
  /** The shaded corner: ratings from xMin up, visibility up to yMax. */
  quadrant?: { xMin: number; yMax: number; label: string };
};

// Check-in bubble chart (C-Competitors): Google rating against AI visibility, bubble size by reviews, the "loved by
// customers, missed by AI" corner shaded, a tooltip per bubble. Recharts draws it.
export function BubbleChart({ points, ariaLabel, xLabel = "Google rating", yLabel = "AI visibility", quadrant }: Props) {
  const reduced = useReducedMotion();
  const xs = points.map((p) => p.x);
  const xMin = Math.max(1, Math.floor((Math.min(...xs) - 0.2) * 5) / 5);
  const xMax = Math.min(5, Math.ceil((Math.max(...xs) + 0.2) * 5) / 5);
  const yTop = Math.max(10, Math.ceil(Math.max(...points.map((p) => p.y)) / 10) * 10 + 10);
  const tick = { fill: CHART.axis, fontSize: 12 };
  // Emphasised last, so the current business sits on top.
  const data = [...points].sort((a, b) => Number(!!a.emphasis) - Number(!!b.emphasis));

  return (
    <div className="overflow-x-auto" role="img" aria-label={ariaLabel}>
      <div className="h-[360px] min-w-[520px]" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 96, bottom: 28, left: 0 }}>
            {quadrant && (
              <ReferenceArea
                x1={Math.max(quadrant.xMin, xMin)}
                x2={xMax}
                y1={0}
                y2={Math.min(quadrant.yMax, yTop)}
                fill={CHART.you}
                fillOpacity={0.07}
                stroke="none"
                ifOverflow="hidden"
                label={{ value: quadrant.label, position: "insideBottomRight", fill: "var(--cd-primary-hover)", fontSize: 13, fontWeight: 600 }}
              />
            )}
            <XAxis
              type="number"
              dataKey="x"
              domain={[xMin, xMax]}
              tickCount={Math.round((xMax - xMin) / 0.2) + 1}
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={tick}
              axisLine={false}
              tickLine={false}
              label={{ value: xLabel, position: "insideBottom", offset: -18, fill: CHART.muted, fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, yTop]}
              tick={tick}
              axisLine={false}
              tickLine={false}
              width={44}
              label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 14, fill: CHART.muted, fontSize: 12 }}
            />
            <ZAxis type="number" dataKey="size" range={[60, 2400]} />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                const p = active ? (payload?.[0]?.payload as Bubble | undefined) : undefined;
                return p ? (
                  <ChartTooltipCard
                    title={p.name}
                    rows={[
                      { label: yLabel, value: `${Math.round(p.y)} of 100` },
                      { label: xLabel, value: `${p.x.toFixed(1)} stars` },
                      { label: "Reviews", value: p.size.toLocaleString("en-US") },
                    ]}
                  />
                ) : null;
              }}
            />
            <Scatter data={data} isAnimationActive={!reduced} animationDuration={700}>
              {data.map((p) => (
                <Cell key={p.name} fill={p.color} fillOpacity={p.emphasis ? 0.9 : 0.55} stroke={p.emphasis ? CHART.ink : CHART.surface} strokeWidth={2} />
              ))}
              <LabelList dataKey="name" position="right" offset={12} fill={CHART.ink} fontSize={13} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
