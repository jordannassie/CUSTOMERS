import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GitCompareArrows, Settings2 } from "lucide-react";
import { KpiStrip, KpiTile } from "@/components/app/KpiTile";
import { PageContainer } from "@/components/app/PageContainer";
import { PageHeader } from "@/components/app/PageHeader";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { ShowGoogle } from "@/components/app/ShowGoogle";
import { PointsChange } from "@/components/overview/PointsChange";
import { AlsoRecommended } from "@/components/competitors/AlsoRecommended";
import { ShareAndModelCards, VisibilityTrendCard } from "@/components/competitors/charts/CompetitorCharts";
import { LeaderTable } from "@/components/competitors/LeaderTable";
import { SectionCard } from "@/components/competitors/SectionCard";
import { SignalsTable } from "@/components/competitors/SignalsTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { compareHref } from "@/lib/compare-href";
import { answersText, getCompetitorsPage, saveCompetitorWebsite, trackCompetitor, type SignalRow, type TableKpis, type TableRow } from "@/modules/competitors";
import { getNextScan } from "@/modules/overview";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Competitors", robots: { index: false } };

const PATH = "/competitors";
const MANAGE = "/competitors/manage";
const ID = /^[0-9a-f-]{36}$/i;

// B-50, MVP_SPEC 8.1, dashboard redesign (2026-10-27): who AI picks more, over time and by AI tool, how you compare
// on Google, and who else AI names. Every reason and fact for one competitor lives on Compare.
export default async function CompetitorsPage({ searchParams }: { searchParams: Promise<{ why?: string; google?: string }> }) {
  // Old "See why" links (?why=<id>) open that competitor on Compare.
  const { why, google } = await searchParams;
  if (why && ID.test(why)) redirect(compareHref(why));
  const workspace = await getWorkspace({ next: PATH });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/dashboard");

  // The next scan's day, for the one-scan chart's note ("The lines start after your next scan on Nov 6").
  const [page, nextScan] = await Promise.all([getCompetitorsPage(business.id, PATH), getNextScan(business.id, PATH)]);
  if (!page) notFound();
  const { view, table } = page;
  // The charts need a score and at least one competitor to compare with.
  const charts = view.charts && view.count > 0 && view.hasScore ? view.charts : null;
  // One scan so far: the table leaves out its trend columns, and its footer says when they come.
  const oneScan = view.count > 0 && view.hasScore && !table.rows.some((r) => r.spark.filter((v) => v !== null).length >= 2 || r.change || r.changeKnown);
  const tracked = view.limit === null ? `${view.count} tracked` : `${view.count} of ${view.limit}`;

  return (
    <PageContainer>
      <div className="flex flex-col gap-5">
        <PageHeader
          title={
            <>
              Competitors <SampleDataBadge show={workspace.account?.isTest} />
            </>
          }
          description="How often AI picks you and the businesses you track, last 30 days."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href={MANAGE}>
                  <Settings2 aria-hidden />
                  Manage list <span className="text-muted-foreground tabular-nums" data-testid="tracked-count">({tracked})</span>
                </Link>
              </Button>
              {view.count > 0 && (
                <Button asChild>
                  <Link href={compareHref()}>
                    <GitCompareArrows aria-hidden />
                    Compare side by side
                  </Link>
                </Button>
              )}
            </div>
          }
        />

        {/* The KPI strip and the trend share one card (mockup-ui); without a chart the strip stands alone. */}
        {charts ? (
          <VisibilityTrendCard charts={charts} nextScan={nextScan} kpis={view.count > 0 && view.hasScore ? <Kpis kpis={table.kpis} rows={table.rows} /> : null} />
        ) : view.count > 0 && view.hasScore ? (
          <Kpis kpis={table.kpis} rows={table.rows} />
        ) : null}

        <SectionCard
          title="Who AI recommends most"
          help="Share of customer questions where each business was named, last 30 days. Compare opens every fact behind a gap."
          actions={
            view.hasScore && view.margin !== null && view.margin > 0 ? (
              <span className="text-xs text-text-hint">Scores are give or take {view.margin} points</span>
            ) : null
          }
          flush={view.count > 0 && view.hasScore}
          footer={
            view.leaderboard.some((r) => r.collecting) || oneScan ? (
              <div className="flex flex-col gap-1">
                {oneScan && <p>The last scans and each change show from your next scan{nextScan ? ` on ${nextScan}` : ""}.</p>}
                {view.leaderboard.some((r) => r.collecting) && (
                  <p data-testid="collecting-note">
                    We only look for a competitor from the day you add it, so a new one scores low at first. We compare you once it has 30 days of checks.
                  </p>
                )}
              </div>
            ) : null
          }
        >
          {view.count === 0 ? (
            <Empty text="Add the businesses you compete with to see who AI recommends more often." action={{ href: MANAGE, label: "Add competitors" }} />
          ) : !view.hasScore ? (
            <Empty
              text="Scores appear after your first scan. Run one from the Overview. Results take about a minute."
              action={{ href: "/dashboard", label: "Go to Overview" }}
            />
          ) : (
            <LeaderTable rows={table.rows} ownDomain={business.domain} website={{ businessId: business.id, save: saveCompetitorWebsite }} />
          )}
        </SectionCard>

        {charts ? <ShareAndModelCards charts={charts} /> : null}

        <SectionCard title="Side by side on Google" help="Ratings, review counts, categories, websites and hours, live from Google. Never stored.">
          {view.count === 0 ? (
            <Empty text="Add competitors to compare your Google reviews, ratings and hours with theirs." />
          ) : google === "1" ? (
            // Asked for: Google answers last, so the rest of the page shows without waiting for them.
            <Suspense fallback={<SignalsLoading rows={view.count + 1} />}>
              <GoogleSignals rows={page.loadSignals()} pickBranch={view.pickBranch} businessId={business.id} />
            </Suspense>
          ) : (
            <ShowGoogle href="/competitors?google=1" text="Ratings, review counts, categories and hours for you and each competitor, live from Google." />
          )}
        </SectionCard>

        <SectionCard
          title="Also recommended by AI"
          actions={<span className="text-xs text-text-hint">Businesses AI named that you do not track yet</span>}
          flush={view.also.length > 0}
        >
          <AlsoRecommended
            businessId={business.id}
            names={view.also.map((n) => ({ ...n, text: answersText(n.answers, view.answers) }))}
            answers={view.answers}
            track={trackCompetitor}
            manageHref={MANAGE}
            layout="table"
          />
        </SectionCard>
      </div>
    </PageContainer>
  );
}

/** The last scans of one row, by the name the KPIs use; none when the name is not on the table (a chain's brand). */
const rowNamed = (rows: TableRow[], name: string | undefined, isYou = false) => rows.find((r) => (isYou ? r.isYou : !r.isYou && r.name === name));

function Kpis({ kpis, rows }: { kpis: TableKpis; rows: TableRow[] }) {
  // A gap inside the margin of error reads "About the same", like the Status column (audit, 2026-10-28).
  const level = kpis.leader?.standing === "about_same";
  const nextLevel = kpis.next?.standing === "about_same";
  const you = rowNamed(rows, undefined, true);
  const leader = kpis.leader ? rowNamed(rows, kpis.leader.name, kpis.leader.isYou) : undefined;
  const next = kpis.next ? rowNamed(rows, kpis.next.name) : undefined;
  // The gap at each scan: the leader's line minus yours, where both were checked.
  const gapTrend =
    leader && you && !leader.isYou && leader.spark.length === you.spark.length
      ? leader.spark.map((v, i) => (v === null || you.spark[i] === null ? null : v - you.spark[i]!))
      : undefined;
  return (
    <KpiStrip testId="competitor-kpis">
      <KpiTile
        label="Your rank"
        value={kpis.rank ? `#${kpis.rank.place}` : "No score yet"}
        sub={kpis.rank ? `of ${kpis.rank.of} tracked businesses` : undefined}
        trend={you?.spark}
        trendColor={you?.color}
        testId="kpi-rank"
      />
      <KpiTile
        label="Leader"
        value={kpis.leader ? (kpis.leader.isYou ? "You" : kpis.leader.name) : "No one yet"}
        sub={kpis.leader ? `Score ${kpis.leader.score}` : undefined}
        trend={leader?.spark}
        trendColor={leader?.color}
        change={leader?.change ? <PointsChange change={leader.change} neutral={!leader.isYou} /> : undefined}
        testId="kpi-leader"
      />
      <KpiTile
        label="Gap to the leader"
        value={kpis.gap === null ? "Not compared yet" : kpis.gap === 0 ? "You lead" : level ? "About the same" : `${kpis.gap} pts`}
        sub={level && kpis.gap ? `${kpis.gap} pts, inside the margin of error` : undefined}
        tone={kpis.gap === 0 ? "good" : kpis.gap && !level ? "mid" : undefined}
        trend={gapTrend}
        trendColor="var(--cd-text-hint)"
        testId="kpi-gap"
      />
      <KpiTile
        label="Next one to pass"
        value={kpis.next ? kpis.next.name : "No one"}
        sub={kpis.next ? (nextLevel ? `About the same, ${kpis.next.points} pts above you` : `${kpis.next.points} pts ahead of you`) : "No one is ahead of you"}
        trend={next?.spark}
        trendColor={next?.color}
        testId="kpi-next"
      />
    </KpiStrip>
  );
}

async function GoogleSignals({ rows, pickBranch, businessId }: { rows: Promise<SignalRow[]>; pickBranch: boolean; businessId: string }) {
  return <SignalsTable rows={await rows} pickBranch={pickBranch} edit={{ businessId, save: saveCompetitorWebsite }} />;
}

function SignalsLoading({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading Google ratings and hours" data-testid="signals-loading">
      {Array.from({ length: Math.min(rows, 6) }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

function Empty({ text, action }: { text: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-start gap-3 py-1" data-testid="empty-state">
      <p className="max-w-prose text-sm text-muted-foreground">{text}</p>
      {action ? (
        <Button asChild size="sm">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
