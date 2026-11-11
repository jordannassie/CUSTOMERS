import { AiMessage, Explain } from "@/components/checkin";
import type { CompetitorChartsView, TableRow } from "@/modules/competitors";
import { VisibilityTrendChart } from "../charts/VisibilityTrendChart";
import { slopeLead } from "./lead";

/** The scans the rows' spark lines cover, first and last, as the axis labels them. */
export function slopeScans(rows: TableRow[], charts: CompetitorChartsView | null) {
  const n = Math.max(0, ...rows.map((r) => r.spark.length));
  const timeline = charts?.timeline ?? [];
  if (n < 2 || timeline.length < n) return null;
  return { from: timeline[timeline.length - n].label, to: timeline[timeline.length - 1].label };
}

// Competitors, first card: who is named more often than you, who gained the most, and each business at every scan.
// With one scan the existing first-scan bars stand in.
export function SlopeCard({ rows, charts, nextScan }: { rows: TableRow[]; charts: CompetitorChartsView | null; nextScan: string | null }) {
  const scans = slopeScans(rows, charts);
  const lead = slopeLead(rows, scans?.from ?? null) ?? "Here's where you stand against the businesses you track.";
  return (
    <AiMessage place="first" leadSize="lg" lead={lead} index={0} testId="competitors-lead">
      {scans && charts ? (
        <>
          {/* One chart for visibility over time: every scan, so there is no separate first-and-latest slope (2026-11-10). */}
          <Explain>
            Here&apos;s each business&apos;s visibility at every scan from {scans.from} to {scans.to}.
            {charts.hidden > 0 ? ` ${charts.hidden} more ${charts.hidden === 1 ? "business is" : "businesses are"} in the table below.` : ""}
          </Explain>
          <VisibilityTrendChart view={charts} nextScan={nextScan} />
        </>
      ) : charts ? (
        <VisibilityTrendChart view={charts} nextScan={nextScan} />
      ) : (
        <Explain>The chart starts after your next scan. Each scan adds a point for you and each competitor.</Explain>
      )}
    </AiMessage>
  );
}

