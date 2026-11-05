import { CHART } from "./chart-kit";
import { Legend } from "./Legend";

export type LollipopRow = { label: string; /** 0 to 100 */ you: number | null; rival: number | null };

type Props = {
  rows: LollipopRow[];
  rivalName: string;
  ariaLabel: string;
  /** Unit after each tick, "%" by default. */
  unit?: string;
};

const W = 720;
const LX = (v: number) => 160 + (v / 100) * 520;

// Check-in paired dots (C-Compare): you and one competitor per AI tool, joined by a line, with how far ahead or
// behind you are. A side with no answers from that tool shows no dot. Hand-built SVG.
export function LollipopRows({ rows, rivalName, ariaLabel, unit = "%" }: Props) {
  const H = 50 + rows.length * 64;
  const base = H - 30;
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[520px]" role="img" aria-label={ariaLabel}>
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={LX(t)} x2={LX(t)} y1="20" y2={base - 4} stroke={CHART.grid} />
              <text x={LX(t)} y={base + 16} textAnchor="middle" fill={CHART.axis} fontSize="12">
                {t}
                {unit}
              </text>
            </g>
          ))}
          {rows.map((r, k) => {
            const yy = 50 + k * 64;
            const both = r.you !== null && r.rival !== null;
            const d = both ? Math.round(r.rival as number) - Math.round(r.you as number) : 0;
            const xa = r.you !== null ? LX(r.you) : null;
            const xb = r.rival !== null ? LX(r.rival) : null;
            const text = !both ? "" : d === 0 ? "Even" : d > 0 ? `${d} pts behind` : `${-d} pts ahead`;
            return (
              <g key={r.label} className="animate-rise" style={{ animationDelay: `${0.3 + k * 0.15}s` }}>
                <text x="20" y={yy + 5} fill={CHART.ink} fontSize="15" fontWeight="600">
                  {r.label}
                </text>
                {xa !== null && xb !== null && (
                  <line
                    x1={Math.min(xa, xb)}
                    x2={Math.max(xa, xb)}
                    y1={yy}
                    y2={yy}
                    stroke={d > 0 ? CHART.rivalMark : d < 0 ? "var(--cd-primary-tint-2)" : CHART.track}
                    strokeWidth="6"
                    strokeLinecap="round"
                  />
                )}
                {xb !== null && <circle cx={xb} cy={yy} r="11" fill={CHART.rival} stroke={CHART.surface} strokeWidth="3" />}
                {xa !== null && <circle cx={xa} cy={yy} r="11" fill={CHART.you} stroke={CHART.surface} strokeWidth="3" />}
                {text && xa !== null && xb !== null && (
                  <text x={(xa + xb) / 2} y={yy - 18} textAnchor="middle" fill={CHART.ink2} fontSize="12">
                    {text}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <Legend
        items={[
          { label: "You", color: CHART.you, strong: true },
          { label: rivalName, color: CHART.rival },
        ]}
      />
    </div>
  );
}
