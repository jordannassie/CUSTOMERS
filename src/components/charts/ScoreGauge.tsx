import { cn } from "cn";
import { CHART, arcPath } from "./chart-kit";

type Props = {
  /** The score, or null before the first one. */
  value: number | null;
  max?: number;
  caption?: string;
  ariaLabel: string;
  className?: string;
};

// Check-in gauge (C-Overview right rail): a semicircle with the score out of 100 in the heading font.
export function ScoreGauge({ value, max = 100, caption = "visibility, of 100", ariaLabel, className }: Props) {
  const share = value === null ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <svg viewBox="0 0 260 140" className={cn("h-auto w-full", className)} role="img" aria-label={ariaLabel}>
      <path d={arcPath(130, 118, 96, -90, 90)} fill="none" stroke={CHART.track} strokeWidth="16" strokeLinecap="round" />
      {value !== null && share > 0 && (
        <path
          d={arcPath(130, 118, 96, -90, -90 + Math.max(1, share * 180))}
          fill="none"
          stroke={CHART.you}
          strokeWidth="16"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          className="animate-draw [animation-delay:0.4s] [animation-duration:1.4s]"
        />
      )}
      {value !== null && (
        <text x="130" y="112" textAnchor="middle" className="font-display font-semibold" fontSize="44" fill={CHART.ink}>
          {Math.round(value)}
        </text>
      )}
      <text x="130" y={value === null ? 112 : 134} textAnchor="middle" fontSize={value === null ? 14 : 12} fill={CHART.muted}>
        {value === null ? "No score yet" : caption}
      </text>
    </svg>
  );
}
