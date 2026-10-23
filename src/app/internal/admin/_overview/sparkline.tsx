const W = 120;
const H = 32;

/**
 * 30 days of one number as a 2px line (DB-018). Each day has a hover target with its value, and the label
 * says the same in words, so the line is never the only way to read it.
 */
export default function Sparkline({ points, label, format }: { points: { day: string; value: number }[]; label: string; format: (n: number) => string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.value), 0);
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => (max > 0 ? H - 2 - (v / max) * (H - 4) : H - 2);
  const peak = points.reduce((best, p) => (p.value > best.value ? p : best));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-8 w-full"
      role="img"
      aria-label={`${label}, last 30 days. Highest ${format(peak.value)} on ${dayText(peak.day)}.`}
    >
      <line x1="0" x2={W} y1={H - 2} y2={H - 2} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <polyline
        points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((p, i) => (
        <rect key={p.day} x={x(i) - W / points.length / 2} y="0" width={W / points.length} height={H} fill="transparent">
          <title>{`${dayText(p.day)}: ${format(p.value)}`}</title>
        </rect>
      ))}
    </svg>
  );
}

function dayText(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
