import { CHART } from "./chart-kit";

type Props = {
  value: number;
  max: number;
  /** Text in the middle; the value when left out. */
  label?: React.ReactNode;
  size?: number;
  color?: string;
  /** Describe it when it carries meaning; left out, the ring is decoration beside text that says the same. */
  ariaLabel?: string;
};

// Check-in progress ring (action cards, "also named" cards): how much of a whole one thing covers.
export function ProgressRing({ value, max, label, size = 48, color = CHART.you, ariaLabel }: Props) {
  const r = 19;
  const c = 2 * Math.PI * r;
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className="shrink-0"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <circle cx="24" cy="24" r={r} fill="none" stroke={CHART.track} strokeWidth="6" />
      {share > 0 && (
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(c * share).toFixed(1)} ${c.toFixed(1)}`}
          transform="rotate(-90 24 24)"
          className="animate-fade"
        />
      )}
      <text x="24" y="28" textAnchor="middle" fontSize="12" fontWeight="700" fill={CHART.ink}>
        {label ?? value}
      </text>
    </svg>
  );
}
