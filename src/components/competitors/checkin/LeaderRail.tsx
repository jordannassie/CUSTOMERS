import Link from "next/link";
import { RailCard, StatRows } from "@/components/checkin";
import { compareHref } from "@/lib/compare-href";
import type { TableKpis } from "@/modules/competitors";

// Competitors right rail: the four numbers the KPI strip showed (same test ids) and the way to Compare. The ranked list
// with each business's last scans is the table on the page, so it is not repeated here (2026-11-10).
export function LeaderRail({ kpis }: { kpis: TableKpis }) {
  const level = kpis.leader?.standing === "about_same";
  const nextLevel = kpis.next?.standing === "about_same";
  return (
    <>
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
        <Link
          href={compareHref()}
          className="flex min-h-11 items-center justify-center rounded-full border border-brand px-4 text-[15px] font-semibold text-brand transition-colors hover:bg-brand-tint"
        >
          Compare side by side
        </Link>
      </RailCard>
    </>
  );
}
