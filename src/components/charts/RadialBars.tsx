import { cn } from "cn";
import { CHART, arcPath } from "./chart-kit";

export type RadialItem = { label: string; /** 0 to 100 */ value: number | null; color: string };

type Props = {
  items: RadialItem[];
  /** The big number in the middle, for example "9", and its caption, for example "of 60". */
  center: { value: string; caption?: string };
  ariaLabel: string;
  className?: string;
};

// Check-in radial bars (C-Overview): one 270 degree arc per AI tool, the share of its answers that named you. A tool
// with no answers keeps its empty track. Up to three rings fit.
export function RadialBars({ items, center, ariaLabel, className }: Props) {
  const rings = items.slice(0, 3);
  return (
    <svg viewBox="0 0 240 240" className={cn("size-[180px] shrink-0 sm:size-[200px]", className)} role="img" aria-label={ariaLabel}>
      {rings.map((t, k) => {
        const r = 96 - k * 24;
        const pct = Math.max(0, Math.min(100, t.value ?? 0));
        return (
          <g key={t.label}>
            <path d={arcPath(120, 120, r, 0, 270)} fill="none" stroke={CHART.track} strokeWidth="16" strokeLinecap="round" />
            {t.value !== null && (
              <path
                d={arcPath(120, 120, r, 0, Math.max(0.6, (pct / 100) * 270))}
                fill="none"
                stroke={t.color}
                strokeWidth="16"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                className="animate-draw"
                style={{ animationDelay: `${0.6 + k * 0.2}s` }}
              />
            )}
            {/* Ends before the arc's round cap (8 units left of its start), so the name never touches the ring. */}
            <text x="104" y={120 - r + 4} fill={CHART.muted} fontSize="11" textAnchor="end">
              {t.label}
            </text>
          </g>
        );
      })}
      <text x="120" y="128" textAnchor="middle" className="font-display font-semibold" fontSize="34" fill={CHART.ink}>
        {center.value}
      </text>
      {center.caption && (
        <text x="120" y="148" textAnchor="middle" fontSize="12" fill={CHART.muted}>
          {center.caption}
        </text>
      )}
    </svg>
  );
}
