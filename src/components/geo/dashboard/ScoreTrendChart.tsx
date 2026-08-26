import type { VisibilityScore } from "@/types/geo";

export default function ScoreTrendChart({
  history,
  compact = false,
}: {
  history: VisibilityScore[];
  compact?: boolean;
}) {
  if (history.length < 2) {
    if (compact) return null;
    return (
      <div className="h-32 flex items-center justify-center text-sm text-[#94A3B8]">
        Run at least two scans to see your trend.
      </div>
    );
  }

  const width = 560;
  const height = compact ? 40 : 128;
  const padding = compact ? 2 : 8;
  const max = 100;

  const points = history.map((h, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - (h.score / max) * (height - padding * 2);
    return { x, y, score: h.score };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={compact ? "w-full h-10" : "w-full h-32"}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={compact ? "scoreAreaCompact" : "scoreArea"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity={compact ? 0.1 : 0.18} />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${compact ? "scoreAreaCompact" : "scoreArea"})`} />
      <path
        d={path}
        fill="none"
        stroke="#2563EB"
        strokeWidth={compact ? 1.5 : 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {!compact &&
        points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#2563EB" />)}
    </svg>
  );
}
