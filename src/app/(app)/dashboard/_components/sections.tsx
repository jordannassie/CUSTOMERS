import { QuestionsMoved, ToolScores, TopActions, WhereAiLooks, WhereYouStand } from "@/components/overview/OverviewCards";
import { OverviewHero } from "@/components/overview/OverviewHero";
import { sourceLines, standingSourceLines } from "@/components/overview/OverviewKpis";
import { ScanChart } from "@/components/overview/ScanChart";
import { WaitForFixes } from "@/components/opportunities/WaitForFixes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { likelyReason, type getOverviewCompete, type getPickedInstead } from "@/modules/competitors";
import { checkFixes, type getFixesState } from "@/modules/insights";
import { OPEN_ACTION_STATUSES, type getActionsBoard } from "@/modules/opportunities";
import type { getOverview, getQuestionTrends } from "@/modules/overview";
import type { getSources } from "@/modules/sources";

// The Overview's slower blocks, each streamed on its own under a Suspense boundary (page.tsx), so the header, the
// Run scan button and the notices show without waiting for the competitor reads.

type Compete = Promise<Awaited<ReturnType<typeof getOverviewCompete>>>;
type Overview = NonNullable<Awaited<ReturnType<typeof getOverview>>>;
type Sources = Awaited<ReturnType<typeof getSources>>;

const OPEN = new Set(OPEN_ACTION_STATUSES);

export async function HeroSection({
  overview,
  compete,
  sources,
  picked,
  sample,
}: {
  overview: Overview;
  compete: Compete;
  sources: Sources;
  picked: Promise<Awaited<ReturnType<typeof getPickedInstead>>>;
  sample: boolean;
}) {
  const [c, p] = await Promise.all([compete, picked]);
  return (
    <OverviewHero
      score={overview.score!}
      compete={c}
      sources={sources}
      sample={sample}
      ownQuestions={overview.ownQuestions}
      ownChain={overview.ownChain}
      reason={likelyReason(p)}
    />
  );
}

export async function ChartSection({ overview, compete, days }: { overview: Overview; compete: Compete; days: number }) {
  const c = await compete;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visibility at each scan</CardTitle>
          <CardDescription>
            Share of each scan&apos;s answers that named each business, last {days} days.
            {(c?.timeline.length ?? 0) > 1 && " Pick a name to hide or show its line."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScanChart timeline={c?.timeline ?? []} lines={c?.lines ?? []} days={days} earlier={c?.earlierScans ?? false} nextScan={overview.nextScan} />
        </CardContent>
      </Card>
      <ToolScores models={overview.models} context={c?.modelContext ?? {}} />
    </div>
  );
}

export async function StandSection({
  businessId,
  compete,
  board,
  fixes,
}: {
  businessId: string;
  compete: Compete;
  board: Promise<Awaited<ReturnType<typeof getActionsBoard>>>;
  fixes: Promise<Awaited<ReturnType<typeof getFixesState>>>;
}) {
  const [c, b, f] = await Promise.all([compete, board, fixes]);
  const open = (b?.items ?? []).filter((a) => OPEN.has(a.status));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WhereYouStand rows={c?.stand ?? []} lines={c?.lines ?? []} />
      <TopActions
        items={open.slice(0, 3)}
        total={open.length}
        wait={f?.pending ? <WaitForFixes businessId={businessId} check={checkFixes} compact /> : null}
      />
    </div>
  );
}

export async function MovedSection({
  trends,
  compete,
  sources,
}: {
  trends: Awaited<ReturnType<typeof getQuestionTrends>>;
  compete: Compete;
  sources: Sources;
}) {
  const c = await compete;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <QuestionsMoved trends={trends} />
      {/* Counted like the report's "Where AI looks"; the Sources page has every question. */}
      <WhereAiLooks rows={standingSourceLines(c?.sites ?? null, c?.ownSite ?? null, sources?.ownSite.host ?? null) ?? sourceLines(sources)} />
    </div>
  );
}
