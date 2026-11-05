import Link from "next/link";
import { cn } from "cn";
import { RailCard, StatRows } from "@/components/checkin";
import { Sparkline } from "@/components/charts";
import { compareHref } from "@/lib/compare-href";
import type { TableKpis, TableRow } from "@/modules/competitors";

// C-Competitors right rail: the leaderboard with each business's last scans, the way to Compare, and the four numbers
// the KPI strip showed (same test ids).
export function LeaderRail({ rows, kpis }: { rows: TableRow[]; kpis: TableKpis }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.spark.filter((v): v is number => v !== null)));
  const level = kpis.leader?.standing === "about_same";
  const nextLevel = kpis.next?.standing === "about_same";
  return (
    <>
      <RailCard title="Leaderboard" testId="rail-leaderboard">
        <ol className="-mx-2 flex flex-col gap-1">
          {rows.map((r, i) => (
            <li
              key={`${r.isYou}-${r.name}`}
              className={cn("grid grid-cols-[20px_minmax(0,1fr)_70px_30px] items-center gap-2.5 rounded-[12px] px-2 py-2.5", r.isYou && "bg-brand-tint-3")}
            >
              <span className="text-[13px] text-muted-foreground tabular-nums">{r.rank ?? i + 1}</span>
              <span className={cn("truncate text-sm", r.isYou ? "font-bold" : "font-medium")} title={r.name}>
                {r.isYou ? `${r.name} (you)` : r.name}
              </span>
              <Sparkline values={r.spark} color={r.color} max={max} />
              <span className="text-right font-bold tabular-nums">{r.score ?? <span className="text-xs font-normal text-muted-foreground">New</span>}</span>
            </li>
          ))}
        </ol>
        <Link
          href={compareHref()}
          className="flex min-h-11 items-center justify-center rounded-full border border-brand px-4 text-[15px] font-semibold text-brand transition-colors hover:bg-brand-tint"
        >
          Compare side by side
        </Link>
      </RailCard>
      <RailCard title="At a glance" testId="competitor-kpis">
        <StatRows
          rows={[
            { label: "Your rank", value: kpis.rank ? `${kpis.rank.place} of ${kpis.rank.of}` : "No score yet", testId: "kpi-rank" },
            {
              label: "Leader",
              value: kpis.leader ? (kpis.leader.isYou ? "You" : `${kpis.leader.name}, ${kpis.leader.score}`) : "No one yet",
              testId: "kpi-leader",
            },
            {
              label: "Gap to the leader",
              value: kpis.gap === null ? "Not compared yet" : kpis.gap === 0 ? "You lead" : level ? `About the same (${kpis.gap} pts)` : `${kpis.gap} pts`,
              tone: kpis.gap === 0 ? "brand" : kpis.gap && !level ? "danger" : undefined,
              testId: "kpi-gap",
            },
            {
              label: "Next one to pass",
              value: kpis.next ? `${kpis.next.name}, ${nextLevel ? "about the same" : `${kpis.next.points} pts ahead`}` : "No one is ahead",
              testId: "kpi-next",
            },
          ]}
        />
      </RailCard>
    </>
  );
}
