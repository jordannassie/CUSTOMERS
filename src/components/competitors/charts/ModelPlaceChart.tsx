import { cn } from "cn";
import type { CompetitorChartsView } from "@/modules/competitors";

type Row = CompetitorChartsView["byModel"][number];
type Series = CompetitorChartsView["series"][number];

/** Your place on one AI: rank among the businesses it scored, and the leader to catch (or your lead). */
function place(row: Row, series: Series[]) {
  const value = (s: Series) => (typeof row[s.key] === "number" ? (row[s.key] as number) : null);
  const you = series.find((s) => s.isYou);
  const yours = you ? value(you) : null;
  const scored = series.map((s) => ({ s, v: value(s) })).filter((x): x is { s: Series; v: number } => x.v !== null);
  const others = scored.filter((x) => !x.s.isYou).sort((a, b) => b.v - a.v);
  const leader = others[0] ?? null;
  const rank = yours === null ? null : 1 + others.filter((x) => x.v > yours).length;
  return { yours, scored, leader, rank, of: scored.length };
}

function summary(p: ReturnType<typeof place>): string {
  if (p.yours === null || p.rank === null) return "No checks yet";
  if (!p.leader) return `${p.yours}%, no competitor scored`;
  const gap = p.leader.v - p.yours;
  if (gap < 0) return `#${p.rank} of ${p.of} · ${-gap} pts ahead of ${p.leader.s.name}`;
  if (gap === 0) return `#${p.rank} of ${p.of} · level with ${p.leader.s.name}`;
  return `#${p.rank} of ${p.of} · ${gap} pts behind ${p.leader.s.name}`;
}

/**
 * "Your place on each AI" (2026-11-10, replaces the By AI model grid that repeated the leaderboard's columns): for
 * each AI tool, every business as a dot on a line from 0 to just past the top score, in its chart colour, you larger in blue, then your rank on
 * that AI and the gap to its leader. Reads as "where am I behind, and by how much" at a glance.
 */
export function ModelPlaceChart({ view }: { view: CompetitorChartsView }) {
  const { series, byModel } = view;
  // The line ends just past the highest score (in tens, 20% to 100%), so close scores do not bunch at one end.
  const top = Math.max(0, ...byModel.flatMap((row) => series.map((s) => (typeof row[s.key] === "number" ? (row[s.key] as number) : 0))));
  const scale = Math.min(100, Math.max(20, Math.ceil((top + 1) / 10) * 10));
  const at = (v: number) => Math.min(Math.max((v / scale) * 100, 1), 99);
  return (
    <figure className="m-0 flex flex-col gap-4" data-testid="model-place-chart">
      <ul className="flex flex-col gap-4">
        {byModel.map((row) => {
          const p = place(row, series);
          // Competitors first, you last, so your dot is drawn on top when two share a score.
          const dots = [...p.scored].sort((a, b) => Number(a.s.isYou) - Number(b.s.isYou));
          return (
            <li key={String(row.model)} className="flex flex-col gap-2" data-testid="model-place">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-[13px] font-medium">{String(row.model)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{summary(p)}</span>
              </div>
              <div className="relative h-4" role="img" aria-label={`${String(row.model)}: ${summary(p)}`}>
                <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" aria-hidden="true" />
                {p.yours !== null && (
                  <span
                    className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-primary/30"
                    style={{ width: `${at(p.yours)}%` }}
                    aria-hidden="true"
                  />
                )}
                {dots.map(({ s, v }) => (
                  <span
                    key={s.key}
                    title={`${s.isYou ? "You" : s.name}: ${v}%`}
                    className={cn(
                      "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface",
                      s.isYou ? "z-10 size-3.5" : "size-2.5",
                    )}
                    style={{ left: `${at(v)}%`, background: s.color }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <figcaption className="flex flex-col gap-2 text-xs text-text-hint">
        <span className="flex justify-between tabular-nums" aria-hidden="true">
          <span>0%</span>
          <span>{scale / 2}%</span>
          <span>{scale}%</span>
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className={cn("rounded-full", s.isYou ? "size-2.5" : "size-2")} style={{ background: s.color }} aria-hidden="true" />
              {s.isYou ? "You" : s.name}
            </span>
          ))}
        </span>
        <span>Share of each AI&apos;s answers that named each business, last 30 days.</span>
      </figcaption>
    </figure>
  );
}
