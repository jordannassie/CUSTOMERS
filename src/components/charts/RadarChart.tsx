"use client";

import { useId } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart as RechartsRadar, ResponsiveContainer } from "recharts";
import { CHART } from "./chart-kit";
import { Legend } from "./Legend";
import { useReducedMotion } from "./use-reduced-motion";

type Props = {
  /** One label per axis (five in the Compare website check). */
  axes: string[];
  /** 0 to 100 per axis, in the order of `axes`. */
  you: number[];
  rival: number[];
  rivalName: string;
  ariaLabel: string;
};

// Check-in radar (C-Compare): five website-readiness axes, the competitor in coral under you in brand blue. Recharts.
export function RadarChart({ axes, you, rival, rivalName, ariaLabel }: Props) {
  const reduced = useReducedMotion();
  const id = useId();
  const data = axes.map((axis, i) => ({ axis, you: you[i] ?? 0, rival: rival[i] ?? 0 }));
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2" role="img" aria-label={ariaLabel}>
      <div className="h-[300px] w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadar id={id} data={data} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid stroke={CHART.border} />
            <PolarAngleAxis dataKey="axis" tick={{ fill: CHART.ink2, fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="rival" stroke={CHART.rival} strokeWidth={2} fill={CHART.rival} fillOpacity={0.22} isAnimationActive={!reduced} />
            <Radar dataKey="you" stroke={CHART.you} strokeWidth={2.5} fill={CHART.you} fillOpacity={0.28} isAnimationActive={!reduced} />
          </RechartsRadar>
        </ResponsiveContainer>
      </div>
      <Legend
        className="justify-center"
        items={[
          { label: "You", color: CHART.you, strong: true },
          { label: rivalName, color: CHART.rival },
        ]}
      />
    </div>
  );
}
