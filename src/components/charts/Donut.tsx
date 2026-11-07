"use client";

import { useId } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { cn } from "cn";
import { CHART } from "./chart-kit";
import { useReducedMotion } from "./use-reduced-motion";

export type DonutSegment = { label: string; value: number; color: string };

type Props = {
  segments: DonutSegment[];
  /** The number in the hole and its caption, for example "0" and "from cheezious.com". */
  center: { value: string; caption?: string; tone?: "danger" | "ink" };
  ariaLabel: string;
  size?: number;
  className?: string;
};

// Check-in donut (C-Sources): uses split by status, with one number in the hole. Recharts draws the ring.
export function Donut({ segments, center, ariaLabel, size = 210, className }: Props) {
  const reduced = useReducedMotion();
  // A stable id: Recharts otherwise numbers its clip paths from a counter that differs between server and browser.
  const id = useId();
  const data = segments.filter((s) => s.value > 0);
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <PieChart id={id} width={size} height={size} aria-hidden="true">
        <Pie
          data={data.length ? data : [{ label: "none", value: 1, color: CHART.track }]}
          dataKey="value"
          nameKey="label"
          innerRadius={size * 0.27}
          outerRadius={size * 0.47}
          startAngle={90}
          endAngle={-270}
          paddingAngle={data.length > 1 ? 1.5 : 0}
          stroke="none"
          isAnimationActive={!reduced}
          animationDuration={900}
        >
          {(data.length ? data : [{ color: CHART.track }]).map((s, i) => (
            <Cell key={i} fill={s.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <span className={cn("font-display font-semibold text-[38px] leading-none", center.tone === "danger" ? "text-danger" : "text-foreground")}>{center.value}</span>
        {center.caption && <span className="mt-1 text-[11px] leading-tight text-muted-foreground break-all">{center.caption}</span>}
      </div>
    </div>
  );
}
