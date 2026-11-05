import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { AiMessage, CheckInLayout, Explain, FollowUps, UserBubble } from "@/components/checkin";
import { AlsoRecommended } from "@/components/competitors/AlsoRecommended";
import { ShareOfVoiceChart } from "@/components/competitors/charts/ShareOfVoiceChart";
import { GoogleCard } from "@/components/competitors/checkin/GoogleCard";
import { LeaderRail } from "@/components/competitors/checkin/LeaderRail";
import { SlopeCard, TrendCard, slopeScans } from "@/components/competitors/checkin/SlopeCard";
import { ToolFavourites } from "@/components/competitors/checkin/ToolFavourites";
import { LeaderTable } from "@/components/competitors/LeaderTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { compareHref } from "@/lib/compare-href";
import { answersText, getCompetitorsPage, saveCompetitorWebsite, trackCompetitor } from "@/modules/competitors";
import { getNextScan } from "@/modules/overview";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Competitors", robots: { index: false } };

const PATH = "/competitors";
const MANAGE = "/competitors/manage";
const ID = /^[0-9a-f-]{36}$/i;

// B-50, MVP_SPEC 8.1, Check-in theme (C-Competitors): the page as a conversation. "Who's ahead of me, and why?", then
// cards that answer it from the page's own data: first scan to latest, scan by scan, the full leaderboard, the share
// of AI picks, each AI tool's favourites, Google (when asked for) and who else AI names. Every reason and fact for one
// competitor lives on Compare.
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
  const scored = view.count > 0 && view.hasScore;
  const charts = scored && view.charts ? view.charts : null;
  // One scan so far: the table leaves out its trend columns, and its footer says when they come.
  const oneScan = scored && !table.rows.some((r) => r.spark.filter((v) => v !== null).length >= 2 || r.change || r.changeKnown);
  const tracked = view.limit === null ? `${view.count} tracked` : `${view.count} of ${view.limit}`;
  const leader = table.rows.find((r) => r.rank === 1 && !r.isYou && r.competitorId);
  const you = charts?.share.find((s) => s.isYou);
  const edit = { businessId: business.id, save: saveCompetitorWebsite };
  let i = 1;

  return (
    <CheckInLayout railLabel="Leaderboard" rail={scored ? <LeaderRail rows={table.rows} kpis={table.kpis} /> : undefined}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-2 font-serif text-[28px] leading-tight font-normal">
            Competitors <SampleDataBadge show={workspace.account?.isTest} />
          </h1>
          <p className="text-sm text-muted-foreground">How often AI picks you and the businesses you track, last 30 days.</p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href={MANAGE}>
            <Settings2 aria-hidden />
            Manage list <span className="text-muted-foreground tabular-nums" data-testid="tracked-count">({tracked})</span>
          </Link>
        </Button>
      </header>

      <UserBubble>Who&apos;s ahead of me, and why?</UserBubble>

      {view.count === 0 ? (
        <Empty lead="You don't track any competitors yet." text="Add the businesses you compete with to see who AI recommends more often." action={{ href: MANAGE, label: "Add competitors" }} />
      ) : !view.hasScore ? (
        <Empty lead="I can't compare you yet." text="Scores appear after your first scan. Run one from the Overview. Results take about a minute." action={{ href: "/dashboard", label: "Go to Overview" }} />
      ) : (
        <>
          <SlopeCard rows={table.rows} charts={charts} nextScan={nextScan} />
          {charts && slopeScans(table.rows, charts) && <TrendCard charts={charts} nextScan={nextScan} index={i++} />}

          <AiMessage lead="Here's everyone you track, ranked over the last 30 days." index={i++} testId="leader-card">
            <Explain>
              Share of customer questions where each business was named. Compare opens every fact behind a gap.
              {view.margin !== null && view.margin > 0 ? ` Scores are give or take ${view.margin} points.` : ""}
            </Explain>
            <div className="-mx-5 sm:-mx-6">
              <LeaderTable rows={table.rows} ownDomain={business.domain} website={edit} />
            </div>
            {(oneScan || view.leaderboard.some((r) => r.collecting)) && (
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                {oneScan && <p>The last scans and each change show from your next scan{nextScan ? ` on ${nextScan}` : ""}.</p>}
                {view.leaderboard.some((r) => r.collecting) && (
                  <p data-testid="collecting-note">
                    We only look for a competitor from the day you add it, so a new one scores low at first. We compare you once it has 30 days of checks.
                  </p>
                )}
              </div>
            )}
          </AiMessage>

          {charts && (
            <AiMessage lead={you ? `Of the times AI named any of you, ${you.share}% were you.` : "Here's how AI shares its picks."} index={i++}>
              <Explain>Of every answer that named you or a tracked competitor, the share that named each one, last 30 days.</Explain>
              <ShareOfVoiceChart view={charts} />
            </AiMessage>
          )}

          <ToolFavourites rows={table.rows} index={i++} />

          <Suspense fallback={<GoogleLoading rows={view.count + 1} />}>
            <GoogleCard signals={google === "1" ? page.loadSignals() : null} rows={table.rows} pickBranch={view.pickBranch} edit={edit} index={i++} />
          </Suspense>

          <AiMessage
            place="last"
            lead={view.also.length > 0 ? "AI also named a few places you don't track yet." : "AI hasn't named anyone else you could track."}
            index={i++}
          >
            <AlsoRecommended
              businessId={business.id}
              names={view.also.map((n) => ({ ...n, text: answersText(n.answers, view.answers) }))}
              answers={view.answers}
              track={trackCompetitor}
              manageHref={MANAGE}
              layout="cards"
            />
          </AiMessage>

          <FollowUps
            items={[
              ...(leader?.competitorId ? [{ label: `How do I compare with ${leader.name}?`, href: compareHref(leader.competitorId) }] : []),
              { label: "Where does AI look?", href: "/sources" },
              { label: "Which questions name me?", href: "/questions" },
            ]}
          />
        </>
      )}
    </CheckInLayout>
  );
}

function GoogleLoading({ rows }: { rows: number }) {
  return (
    <AiMessage lead="Asking Google for ratings and reviews.">
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading Google ratings and hours" data-testid="signals-loading">
        {Array.from({ length: Math.min(rows, 6) }, (_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </AiMessage>
  );
}

function Empty({ lead, text, action }: { lead: string; text: string; action: { href: string; label: string } }) {
  return (
    <AiMessage place="only" leadSize="lg" lead={lead}>
      <div className="flex flex-col items-start gap-3" data-testid="empty-state">
        <Explain>{text}</Explain>
        <Button asChild>
          <Link href={action.href}>{action.label}</Link>
        </Button>
      </div>
    </AiMessage>
  );
}
