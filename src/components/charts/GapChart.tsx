import { useId } from "react";
import { CHART, niceScale, smoothPath } from "./chart-kit";
import { Legend } from "./Legend";

type Line = { name: string; values: (number | null)[] };

type Props = {
  labels: string[];
  you: Line;
  rival: Line;
  ariaLabel: string;
};

const W = 760;
const H = 260;
const LEFT = 44;
const RIGHT = 650;
const TOP = 20;
const BOTTOM = 232;

// Check-in gap chart (C-Compare): you and one competitor over time, the space between the lines filled with a dotted
// coral pattern, and the gap labelled at each scan where both were checked. Hand-built SVG: Recharts cannot fill
// between two lines.
export function GapChart({ labels, you, rival, ariaLabel }: Props) {
  const patternId = `gap${useId().replace(/:/g, "")}`;
  const n = labels.length;
  const all = [...you.values, ...rival.values].filter((v): v is number => v !== null);
  const { top, ticks } = niceScale(Math.max(0, ...all));
  const x = (i: number) => (n > 1 ? LEFT + (i * (RIGHT - LEFT)) / (n - 1) : (LEFT + RIGHT) / 2);
  const y = (v: number) => BOTTOM - (v / top) * (BOTTOM - TOP);
  // Only scans where both were checked: the fill and labels never guess a value.
  const both = labels.map((_, i) => i).filter((i) => you.values[i] !== null && rival.values[i] !== null);
  const yp = both.map((i) => [x(i), y(you.values[i] as number)] as const);
  const rp = both.map((i) => [x(i), y(rival.values[i] as number)] as const);
  const gap = both.length > 1 ? `${smoothPath(rp)} ${smoothPath([...yp].reverse()).replace("M", "L")} Z` : "";
  const lastYou = yp.at(-1);
  const lastRival = rp.at(-1);
  // Coral while they lead at the latest scan, brand blue once you do.
  const lastBoth = both.at(-1);
  const behind = lastBoth === undefined || (rival.values[lastBoth] as number) >= (you.values[lastBoth] as number);
  const fillTint = behind ? CHART.rivalTint : "var(--cd-primary-tint)";
  const fillDot = behind ? CHART.rival : CHART.you;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[560px]" role="img" aria-label={ariaLabel}>
          <defs>
            <pattern id={patternId} width="7" height="7" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill={fillTint} />
              <circle cx="3.5" cy="3.5" r="1.2" fill={fillDot} fillOpacity="0.55" />
            </pattern>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={LEFT} x2={RIGHT} y1={y(t)} y2={y(t)} stroke={CHART.grid} />
              <text x={LEFT - 10} y={y(t) + 4} fill={CHART.axis} fontSize="12" textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {labels.map((l, i) => (
            <text key={i} x={x(i)} y={H - 4} fill={CHART.axis} fontSize="12" textAnchor="middle">
              {l}
            </text>
          ))}
          {gap && <path d={gap} fill={`url(#${patternId})`} className="animate-fade [animation-delay:1.2s]" />}
          {[{ pts: rp, color: CHART.rival, w: 3, d: 0.6 }, { pts: yp, color: CHART.you, w: 4, d: 0.8 }].map((l, k) =>
            l.pts.length > 1 ? (
              <path
                key={k}
                d={smoothPath(l.pts)}
                fill="none"
                stroke={l.color}
                strokeWidth={l.w}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                className="animate-draw [animation-duration:1.4s]"
                style={{ animationDelay: `${l.d}s` }}
              />
            ) : l.pts[0] ? (
              <circle key={k} cx={l.pts[0][0]} cy={l.pts[0][1]} r="6" fill={l.color} stroke={CHART.surface} strokeWidth="2" />
            ) : null,
          )}
          {both.map((i, k) => {
            const a = you.values[i] as number;
            const b = rival.values[i] as number;
            const mid = (y(a) + y(b)) / 2;
            const v = Math.round(b) - Math.round(a);
            const ahead = v < 0;
            return (
              <g key={i} className="animate-fade" style={{ animationDelay: `${1.4 + k * 0.08}s` }}>
                <rect x={x(i) - 18} y={mid - 10} width="36" height="20" rx="10" fill={CHART.surface} stroke={ahead ? CHART.you : CHART.rival} strokeOpacity="0.6" />
                <text x={x(i)} y={mid + 4} textAnchor="middle" fill={ahead ? "var(--cd-primary-hover)" : CHART.rivalInk} fontSize="11" fontWeight="700">
                  {Math.abs(v)}
                </text>
              </g>
            );
          })}
          {lastRival && (
            <text x={RIGHT + 12} y={lastRival[1] + 4} fill={CHART.rivalText} fontSize="13" fontWeight="700">
              {rival.name.length > 12 ? "Them" : rival.name}
            </text>
          )}
          {lastYou && (
            <text x={RIGHT + 12} y={lastYou[1] + (lastRival && Math.abs(lastRival[1] - lastYou[1]) < 16 ? 18 : 4)} fill={CHART.you} fontSize="13" fontWeight="700">
              You
            </text>
          )}
        </svg>
      </div>
      <Legend
        shape="square"
        items={[
          { label: "You", color: CHART.you, strong: true },
          { label: rival.name, color: CHART.rival },
          // The swatch repeats the dotted fill, so it reads as the shaded area.
          { label: "Gap in points at each scan", color: `radial-gradient(circle, ${fillDot} 0.9px, ${fillTint} 1.2px) 0 0 / 4px 4px` },
        ]}
      />
    </div>
  );
}
