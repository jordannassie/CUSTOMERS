import { CHART, signed, spreadLabels } from "./chart-kit";
import { ScrollX } from "./ScrollX";

export type SlopeRow = { name: string; from: number | null; to: number | null; color: string; emphasis?: boolean };

type Props = {
  fromLabel: string;
  toLabel: string;
  rows: SlopeRow[];
  ariaLabel: string;
  format?: (n: number) => string;
};

const W = 640;
const H = 310;
const X1 = 190;
const X2 = 450;
const TOP = 30;
const BOTTOM = 280;

// Check-in slope chart (C-Competitors): each business at the first scan and the latest one, the change on the right,
// you emphasised. A business not checked at one end shows only the end it has. Hand-built SVG.
export function SlopeChart({ fromLabel, toLabel, rows, ariaLabel, format = (n) => String(Math.round(n)) }: Props) {
  const all = rows.flatMap((r) => [r.from, r.to]).filter((v): v is number => v !== null);
  const top = Math.max(10, ...all);
  const y = (v: number) => BOTTOM - (v / top) * (BOTTOM - TOP);
  const leftYs = spreadLabels(rows.map((r) => y(r.from ?? r.to ?? 0)), 16, TOP, BOTTOM + 6);
  const rightYs = spreadLabels(rows.map((r) => y(r.to ?? r.from ?? 0)), 16, TOP, BOTTOM + 6);
  const ordered = rows.map((r, i) => ({ r, i })).sort((a, b) => Number(!!a.r.emphasis) - Number(!!b.r.emphasis));

  return (
    <ScrollX>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[520px]" role="img" aria-label={ariaLabel}>
        <line x1={X1} x2={X1} y1={TOP - 6} y2={BOTTOM + 2} stroke={CHART.border} />
        <line x1={X2} x2={X2} y1={TOP - 6} y2={BOTTOM + 2} stroke={CHART.border} />
        <text x={X1} y="14" textAnchor="middle" fill={CHART.muted} fontSize="12">
          {fromLabel}
        </text>
        <text x={X2} y="14" textAnchor="middle" fill={CHART.muted} fontSize="12">
          {toLabel}
        </text>
        {ordered.map(({ r, i }, k) => {
          const change = r.from !== null && r.to !== null ? Math.round(r.to) - Math.round(r.from) : null;
          const weight = r.emphasis ? 700 : 500;
          const ink = r.emphasis ? CHART.you : CHART.ink;
          return (
            <g key={r.name}>
              {r.from !== null && r.to !== null && (
                <line
                  x1={X1}
                  y1={y(r.from)}
                  x2={X2}
                  y2={y(r.to)}
                  stroke={r.color}
                  strokeWidth={r.emphasis ? 5 : 3}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  className="animate-draw [animation-duration:1.2s]"
                  style={{ animationDelay: `${0.4 + k * 0.12}s` }}
                />
              )}
              {r.from !== null && <circle cx={X1} cy={y(r.from)} r="6" fill={r.color} stroke={CHART.surface} strokeWidth="2" />}
              {r.to !== null && <circle cx={X2} cy={y(r.to)} r="6" fill={r.color} stroke={CHART.surface} strokeWidth="2" />}
              <text x={X1 - 14} y={leftYs[i] + 4} textAnchor="end" fill={ink} fontSize="13" fontWeight={weight}>
                {r.name} {r.from !== null ? format(r.from) : ""}
              </text>
              <text x={X2 + 14} y={rightYs[i] + 4} fill={ink} fontSize="13" fontWeight={weight}>
                {r.to !== null ? format(r.to) : ""}
                {change ? ` (${signed(change)})` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </ScrollX>
  );
}
