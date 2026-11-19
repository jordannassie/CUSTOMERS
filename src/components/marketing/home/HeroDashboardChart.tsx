import { cn } from "cn";

export type ChartLine = { name: string; values: number[]; color: string; you?: boolean };

const W = 600;
const H = 220;
const LEFT = 30;
const RIGHT = W - 40;
const TOP = 12;
const BOTTOM = H - 26;
const TICKS = [0, 25, 50, 75, 100];

const x = (i: number, n: number) => LEFT + (i * (RIGHT - LEFT)) / (n - 1);
const y = (v: number) => BOTTOM - (v / 100) * (BOTTOM - TOP);

// A smooth line through the points (the same curve the live site's mockup used).
function path(values: number[]) {
  const pts = values.map((v, i) => [x(i, values.length), y(v)] as const);
  return pts.reduce((d, [px, py], i) => {
    if (i === 0) return `M ${px.toFixed(1)} ${py.toFixed(1)}`;
    const [qx, qy] = pts[i - 1];
    const mid = ((qx + px) / 2).toFixed(1);
    return `${d} C ${mid} ${qy.toFixed(1)} ${mid} ${py.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
  }, "");
}

// End labels at least 14 units apart, so close scores (62 and 57) don't print on top of each other.
function labelY(lines: ChartLine[]) {
  const sorted = lines.map((l) => ({ name: l.name, y: y(l.values.at(-1)!) })).sort((a, b) => a.y - b.y);
  sorted.forEach((l, i) => {
    if (i > 0 && l.y - sorted[i - 1].y < 14) l.y = sorted[i - 1].y + 14;
  });
  return new Map(sorted.map((l) => [l.name, l.y]));
}

/** Score over time for a few businesses: you thicker and on top, each line's last value at its end, a legend above. */
export function HeroDashboardChart({ labels, lines, ariaLabel }: { labels: string[]; lines: ChartLine[]; ariaLabel: string }) {
  const ordered = [...lines].sort((a, b) => Number(!!a.you) - Number(!!b.you));
  const labelAt = labelY(lines);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {lines.map((l) => (
          <li key={l.name} className="flex items-center gap-1.5">
            <span className="h-0.5 w-3.5 rounded-xs" style={{ background: l.color }} aria-hidden="true" />
            <span className={cn(l.you && "font-medium text-foreground")}>{l.name}</span>
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[440px]" role="img" aria-label={ariaLabel}>
          {TICKS.map((t) => (
            <g key={t}>
              <line x1={LEFT} x2={RIGHT} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth="1" />
              <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" className="fill-text-hint text-[11px]">
                {t}
              </text>
            </g>
          ))}
          {labels.map((label, i) =>
            i % 3 === 0 || i === labels.length - 1 ? (
              <text key={label} x={x(i, labels.length)} y={H - 6} textAnchor="middle" className="fill-text-hint text-[11px]">
                {label}
              </text>
            ) : null,
          )}
          {ordered.map((l) => {
            const last = l.values.at(-1)!;
            const lx = x(l.values.length - 1, l.values.length);
            return (
              <g key={l.name}>
                <path d={path(l.values)} fill="none" style={{ stroke: l.color }} strokeWidth={l.you ? 3 : 2} strokeLinecap="round" />
                <circle cx={lx} cy={y(last)} r={l.you ? 4 : 3} style={{ fill: l.color }} />
                <text x={lx + 8} y={labelAt.get(l.name)! + 4} className={cn("fill-foreground text-[12px]", l.you && "font-semibold")}>
                  {last}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-xs text-text-hint sm:hidden">Swipe the chart to see the latest weeks</p>
    </div>
  );
}
