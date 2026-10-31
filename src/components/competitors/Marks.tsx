import type { CSSProperties } from "react";
import { cn } from "cn";

// Small marks the Competitors pages share (mockup-ui): a score ring in the business's color, and a heat cell whose blue
// deepens with its value. Decorative: the number is always written beside or inside them.

/** One blue, light to dark with the value, on the card's own white: a sequential scale, never a rainbow. */
export const heatFill = (v: number) => `color-mix(in oklab, var(--chart-1) ${Math.round(6 + v * 0.8)}%, var(--card))`;

/** Dark text until the blue is deep enough for white text to read well on it. */
export const heatText = (v: number) => (v >= 80 ? "text-white" : "text-foreground");

export const heatStyle = (v: number): CSSProperties => ({ background: heatFill(v) });

/** A ring filled to the score (0 to 100) in the business's color. */
export function ScoreRing({ value, color, size = 30, className }: { value: number | null; color: string; size?: number; className?: string }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={cn("shrink-0", className)}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth="3" />
      {v > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${((v / 100) * c).toFixed(1)} ${c.toFixed(1)}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </svg>
  );
}

/** A per-AI value as a blue-tinted cell, or a quiet "Not checked". */
export function HeatCell({ value, suffix = "%" }: { value: number | null | undefined; suffix?: string }) {
  if (value === null || value === undefined) return <span className="text-xs text-text-hint">Not checked</span>;
  return (
    <span className={cn("inline-grid h-[26px] min-w-[46px] place-items-center rounded-md px-1.5 text-[12.5px] font-semibold tabular-nums", heatText(value))} style={heatStyle(value)}>
      {value}
      {suffix}
    </span>
  );
}
