import { TopActions, WhereAiLooks } from "@/components/overview/OverviewCards";
import { sourceLines, standingSourceLines } from "@/components/overview/OverviewKpis";
import { OverviewSummary } from "@/components/overview/OverviewSummary";
import { ToolScores } from "@/components/overview/ToolScores";
import { WaitForFixes } from "@/components/opportunities/WaitForFixes";
import { likelyReason, type getOverviewCompete, type getPickedInstead } from "@/modules/competitors";
import { checkFixes, type getFixesState } from "@/modules/insights";
import { OPEN_ACTION_STATUSES, type getActionsBoard } from "@/modules/opportunities";
import type { getOverview } from "@/modules/overview";
import type { getSources } from "@/modules/sources";

// The Overview's slower blocks, each streamed on its own under a Suspense boundary (page.tsx), so the header, the
// Run scan button and the notices show without waiting for the competitor reads.

type Compete = Promise<Awaited<ReturnType<typeof getOverviewCompete>>>;
type Overview = NonNullable<Awaited<ReturnType<typeof getOverview>>>;
type Sources = Awaited<ReturnType<typeof getSources>>;

const OPEN = new Set(OPEN_ACTION_STATUSES);

/** The main card: the four numbers, the score's explanation, the per-scan chart and who AI picks most. */
export async function SummarySection({
  overview,
  compete,
  sources,
  picked,
  sample,
  days,
}: {
  overview: Overview;
  compete: Compete;
  sources: Sources;
  picked: Promise<Awaited<ReturnType<typeof getPickedInstead>>>;
  sample: boolean;
  days: number;
}) {
  const [c, p] = await Promise.all([compete, picked]);
  return (
    <OverviewSummary
      score={overview.score!}
      trend={overview.trend.points.map((t) => t.score)}
      compete={c}
      sources={sources}
      sample={sample}
      ownQuestions={overview.ownQuestions}
      ownChain={overview.ownChain}
      reason={likelyReason(p)}
      days={days}
      nextScan={overview.nextScan}
    />
  );
}

export async function ToolsSection({ overview, compete }: { overview: Overview; compete: Compete }) {
  const c = await compete;
  return <ToolScores models={overview.models} context={c?.modelContext ?? {}} />;
}

export async function SourcesActionsSection({
  businessId,
  compete,
  sources,
  board,
  fixes,
}: {
  businessId: string;
  compete: Compete;
  sources: Sources;
  board: Promise<Awaited<ReturnType<typeof getActionsBoard>>>;
  fixes: Promise<Awaited<ReturnType<typeof getFixesState>>>;
}) {
  const [c, b, f] = await Promise.all([compete, board, fixes]);
  const open = (b?.items ?? []).filter((a) => OPEN.has(a.status));
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Counted like the report's "Where AI looks"; the Sources page has every question. */}
      <WhereAiLooks rows={standingSourceLines(c?.sites ?? null, c?.ownSite ?? null, sources?.ownSite.host ?? null) ?? sourceLines(sources)} />
      <TopActions
        items={open.slice(0, 3)}
        total={open.length}
        wait={f?.pending ? <WaitForFixes businessId={businessId} check={checkFixes} compact /> : null}
      />
    </div>
  );
}
