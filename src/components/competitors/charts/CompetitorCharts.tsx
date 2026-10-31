import type { ReactNode } from "react";
import type { CompetitorChartsView } from "@/modules/competitors";
import { CardHead, SectionCard } from "../SectionCard";
import { ModelComparisonChart } from "./ModelComparisonChart";
import { ShareOfVoiceChart } from "./ShareOfVoiceChart";
import { VisibilityTrendChart } from "./VisibilityTrendChart";

// The Competitors page charts (2026-10-23; mockup-ui cards): the trend under the KPI strip, then the share of AI picks
// and the per-AI comparison side by side.

/**
 * The trend in a card. `kpis`: a KpiStrip joined to the top of the same card, its outer border hidden under the
 * card's own, so the numbers and the chart read as one block (mockup-ui).
 */
export function VisibilityTrendCard({ charts, nextScan = null, kpis }: { charts: CompetitorChartsView; nextScan?: string | null; kpis?: ReactNode }) {
  const more = charts.hidden > 0 ? `, ${charts.hidden} more in the table below` : "";
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card" data-testid="trend-card">
      {kpis ? <div className="-m-px *:rounded-none">{kpis}</div> : null}
      <CardHead title="Visibility over time" help={`You and your top competitors at each scan${more}.`} />
      <div className="px-[18px] pt-4 pb-3">
        <VisibilityTrendChart view={charts} nextScan={nextScan} />
      </div>
    </section>
  );
}

export function ShareAndModelCards({ charts }: { charts: CompetitorChartsView }) {
  return (
    // Both cards take the row's height, and the donut sits in the middle of its card, so neither leaves a gap below.
    <div className="grid items-stretch gap-5 lg:grid-cols-2">
      <SectionCard
        title="Your share of AI picks"
        help="Of every answer that named you or a tracked competitor, the share that named each one, last 30 days."
        bodyClassName="flex items-center"
      >
        <ShareOfVoiceChart view={charts} />
      </SectionCard>
      <SectionCard title="By AI model" help="Share of each AI's answers that named each business, last 30 days." bodyClassName="flex flex-col justify-center">
        <ModelComparisonChart view={charts} />
      </SectionCard>
    </div>
  );
}
