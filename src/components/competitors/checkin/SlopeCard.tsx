import { AiMessage, Explain } from "@/components/checkin";
import { SlopeChart } from "@/components/charts";
import type { CompetitorChartsView, TableRow } from "@/modules/competitors";
import { VisibilityTrendChart } from "../charts/VisibilityTrendChart";
import { ends, slopeLead } from "./lead";

/** The scans the rows' spark lines cover, first and last, as the axis labels them. */
export function slopeScans(rows: TableRow[], charts: CompetitorChartsView | null) {
  const n = Math.max(0, ...rows.map((r) => r.spark.length));
  const timeline = charts?.timeline ?? [];
  if (n < 2 || timeline.length < n) return null;
  return { from: timeline[timeline.length - n].label, to: timeline[timeline.length - 1].label };
}

// C-Competitors, first card: who is named more often than you, who gained the most, and each business at the first
// scan shown and the latest one. With one scan the existing first-scan bars stand in (no slope from one point).
export function SlopeCard({ rows, charts, nextScan }: { rows: TableRow[]; charts: CompetitorChartsView | null; nextScan: string | null }) {
  const scans = slopeScans(rows, charts);
  const lead = slopeLead(rows, scans?.from ?? null) ?? "Here's where you stand against the businesses you track.";
  const shown = rows.filter((r) => r.spark.some((v) => v !== null));
  const summary = shown
    .map((r) => {
      const e = ends(r);
      return `${r.isYou ? `${r.name} (you)` : r.name} ${e.from ?? "not checked"} to ${e.to ?? "not checked"}`;
    })
    .join(". ");
  return (
    <AiMessage place="first" leadSize="lg" lead={lead} index={0} testId="competitors-lead">
      {scans ? (
        <>
          <Explain>Here&apos;s each business&apos;s visibility at the {scans.from} scan and your latest one, on {scans.to}.</Explain>
          <SlopeChart
            fromLabel={scans.from}
            toLabel={scans.to}
            ariaLabel={`Slope chart from ${scans.from} to ${scans.to}. ${summary}.`}
            rows={shown.map((r) => ({ name: r.isYou ? `${r.name} (you)` : r.name, from: ends(r).from, to: ends(r).to, color: r.color, emphasis: r.isYou }))}
          />
        </>
      ) : charts ? (
        <VisibilityTrendChart view={charts} nextScan={nextScan} />
      ) : (
        <Explain>The chart starts after your next scan. Each scan adds a point for you and each competitor.</Explain>
      )}
    </AiMessage>
  );
}

// The scan-by-scan trend (kept from the earlier page): every scan between the first and the latest.
export function TrendCard({ charts, nextScan, index }: { charts: CompetitorChartsView; nextScan: string | null; index: number }) {
  const more = charts.hidden > 0 ? ` ${charts.hidden} more ${charts.hidden === 1 ? "business is" : "businesses are"} in the table below.` : "";
  return (
    <AiMessage lead="Here's how each one moved, scan by scan." index={index} testId="trend-card">
      <Explain>You and your top competitors at each scan.{more}</Explain>
      <VisibilityTrendChart view={charts} nextScan={nextScan} />
    </AiMessage>
  );
}
