import { sparkPoints } from "@/lib/chart-scale";

/**
 * The last scans as a small line, scaled to its own low and high so the shape shows even when the numbers move a
 * little. Decorative: the score and change beside it carry the numbers.
 */
export function Sparkline({ values, you = false, color }: { values: (number | null)[]; you?: boolean; color?: string }) {
  const stroke = color ?? (you ? "var(--chart-1)" : "var(--chart-2)");
  const known = values.filter((v) => v !== null);
  if (known.length < 2) return <span className="text-xs text-text-hint">Not enough scans</span>;
  const points = sparkPoints(values, 72, 20);
  const last = points.split(" ").at(-1)!.split(",");
  return (
    <svg width="76" height="24" viewBox="-2 -2 76 24" aria-hidden="true" className="overflow-visible">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={stroke} />
    </svg>
  );
}
