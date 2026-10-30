import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GitCompareArrows, Settings2 } from "lucide-react";
import { KpiStrip, KpiTile } from "@/components/app/KpiTile";
import { PageContainer } from "@/components/app/PageContainer";
import { PageHeader } from "@/components/app/PageHeader";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { ShowGoogle } from "@/components/app/ShowGoogle";
import { AlsoRecommended } from "@/components/competitors/AlsoRecommended";
import { ShareAndModelCards, VisibilityTrendCard } from "@/components/competitors/charts/CompetitorCharts";
import { LeaderTable } from "@/components/competitors/LeaderTable";
import { SignalsTable } from "@/components/competitors/SignalsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { compareHref } from "@/lib/compare-href";
import { answersText, getCompetitorsPage, saveCompetitorWebsite, trackCompetitor, type SignalRow, type TableKpis } from "@/modules/competitors";
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
  const tracked = view.limit === null ? `${view.count} tracked` : `${view.count} of ${view.limit}`;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={
            <>
              Competitors <SampleDataBadge show={workspace.account?.isTest} />
            </>
          }
          description="How often AI picks you vs competitors over the last 30 days."
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

        {view.count > 0 && view.hasScore && <Kpis kpis={table.kpis} />}

        {charts ? <VisibilityTrendCard charts={charts} nextScan={nextScan} /> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Who AI recommends most</CardTitle>
            <CardDescription>
              Share of customer questions where each business was named, last 30 days. Compare opens every fact behind a gap.
              {view.hasScore && view.margin !== null && view.margin > 0 ? ` Scores are give or take ${view.margin} points.` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {view.count === 0 ? (
              <Empty text="Add the businesses you compete with to see who AI recommends more often." action={{ href: MANAGE, label: "Add competitors" }} />
            ) : !view.hasScore ? (
              <Empty
                text="Scores appear after your first scan. Run one from the Overview. Results take about a minute."
                action={{ href: "/dashboard", label: "Go to Overview" }}
              />
            ) : (
              <LeaderTable rows={table.rows} />
            )}
            {view.leaderboard.some((r) => r.collecting) ? (
              <p className="mt-3 text-xs text-text-hint" data-testid="collecting-note">
                We only look for a competitor from the day you add it, so a new one scores low at first. We compare you once it has 30 days of checks.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {charts ? <ShareAndModelCards charts={charts} /> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Side by side on Google</CardTitle>
          </CardHeader>
          <CardContent>
            {view.count === 0 ? (
              <Empty text="Add competitors to compare your Google reviews, ratings and hours with theirs." />
            ) : (
              google === "1" ? (
                // Asked for: Google answers last, so the rest of the page shows without waiting for them.
                <Suspense fallback={<SignalsLoading rows={view.count + 1} />}>
                  <GoogleSignals rows={page.loadSignals()} pickBranch={view.pickBranch} businessId={business.id} />
                </Suspense>
              ) : (
                <ShowGoogle href="/competitors?google=1" text="Ratings, review counts, categories and hours for you and each competitor, live from Google." />
              )
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Also recommended by AI</CardTitle>
            <CardDescription>Businesses AI named that you do not track yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlsoRecommended
              businessId={business.id}
              names={view.also.map((n) => ({ ...n, text: answersText(n.answers, view.answers) }))}
              answers={view.answers}
              track={trackCompetitor}
              manageHref={MANAGE}
              layout="grid"
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function Kpis({ kpis }: { kpis: TableKpis }) {
  // A gap inside the margin of error reads "About the same", like the Status column (audit, 2026-10-28).
  const level = kpis.leader?.standing === "about_same";
  const nextLevel = kpis.next?.standing === "about_same";
  return (
    <KpiStrip testId="competitor-kpis">
      <KpiTile label="Your rank" value={kpis.rank ? `#${kpis.rank.place}` : "No score yet"} sub={kpis.rank ? `of ${kpis.rank.of} tracked businesses` : undefined} testId="kpi-rank" />
      <KpiTile
        label="Leader"
        value={kpis.leader ? (kpis.leader.isYou ? "You" : kpis.leader.name) : "No one yet"}
        sub={kpis.leader ? `Score ${kpis.leader.score}` : undefined}
        testId="kpi-leader"
      />
      <KpiTile
        label="Gap to the leader"
        value={kpis.gap === null ? "Not compared yet" : kpis.gap === 0 ? "You lead" : level ? "About the same" : `${kpis.gap} pts`}
        sub={level && kpis.gap ? `${kpis.gap} pts, inside the margin of error` : undefined}
        tone={kpis.gap === 0 ? "good" : kpis.gap && !level ? "mid" : undefined}
        testId="kpi-gap"
      />
      <KpiTile
        label="Next one to pass"
        value={kpis.next ? kpis.next.name : "No one"}
        sub={kpis.next ? (nextLevel ? `About the same, ${kpis.next.points} pts above you` : `${kpis.next.points} pts ahead of you`) : "No one is ahead of you"}
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
    <div className="flex flex-col items-start gap-4 py-4" data-testid="empty-state">
      <p className="max-w-prose text-sm text-muted-foreground">{text}</p>
      {action ? (
        <Button asChild size="sm">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </div>
  );
}
