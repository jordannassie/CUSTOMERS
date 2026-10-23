import { smoothPath } from "./lib";

const W = 320;
const H = 80;

/** Small trend line; the business is always the primary blue (DESIGN.md charts rule). */
export function MiniChart({ values, label }: { values: number[]; label: string }) {
  return (
    <svg viewBox={`0 -2 ${W} ${H + 4}`} preserveAspectRatio="none" className="h-20 w-full" role="img" aria-label={label}>
      {[25, 50, 75].map((v) => (
        <line
          key={v}
          x1="0"
          x2={W}
          y1={H - (v / 100) * H}
          y2={H - (v / 100) * H}
          className="stroke-border"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path
        d={smoothPath(values, W, H)}
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
