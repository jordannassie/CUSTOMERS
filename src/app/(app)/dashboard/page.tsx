import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Share2 } from "lucide-react";
import { RunScanButton } from "@/components/app/RunScanButton";
import { ScoreGauge } from "@/components/charts";
import { AiMessage, CheckInLayout, Composer, DayRule, Explain, FollowUps, RailCard, RailNotice, UserBubble } from "@/components/checkin";
import { ScoreGlance } from "@/components/overview/checkin/Glance";
import { RANGES, RangeControl } from "@/components/overview/OverviewKpis";
import { Button } from "@/components/ui/button";
import { compareHref } from "@/lib/compare-href";
import { getOverviewCompete, getPickedInstead } from "@/modules/competitors";
import { getFixesState } from "@/modules/insights";
import { getScanStatus, startScan } from "@/modules/jobs";
import { getActionsBoard } from "@/modules/opportunities";
import { getOverview, getQuestionTrends } from "@/modules/overview";
import { getSources } from "@/modules/sources";
import { getWorkspace } from "@/modules/workspace";
import { ActionsSection, RailSection, ThreadSection } from "./_components/sections";
import { ActionsSkeleton, RailSkeleton, ThreadSkeleton } from "./_components/section-skeletons";

export const metadata = { title: "Overview", robots: { index: false } };

/** Started now and awaited by a streamed section; a failure still reaches that section's error boundary. */
function later<T>(promise: Promise<T>): Promise<T> {
  // Marks it handled, so a page that stops early (not found, redirect) leaves no unhandled rejection behind.
  promise.catch(() => {});
  return promise;
}

// B-49, MVP_SPEC 8.1, Check-in theme (docs/design/files/C-Overview.dc.html): the Overview as a conversation. The user
// asks how AI did; AI messages answer with how often it named you per tool, the line per scan, where AI looks, which
// questions moved and the top fixes; the rail has the score gauge and the numbers. The range changes the chart and
// counts; the score stays 30 days (D-63).
export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const asked = Number((await searchParams).range);
  const days = (RANGES as readonly number[]).includes(asked) ? asked : 30;
  const workspace = await getWorkspace({ next: "/dashboard" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  // Setup is the onboarding wizard's job (B-36); it resumes where the user stopped.
  if (!business || business.status === "onboarding") redirect("/onboarding");

  // Everything starts at once. The header and notices wait for the reads they show; the messages stream in below as
  // each is ready (they share the score's answers through React's cache).
  const compete = later(getOverviewCompete(business.id, days));
  // The same likely reason as the report and the weekly email (database reads only, no AI or Google call).
  const picked = later(getPickedInstead(business.id));
  const board = later(getActionsBoard(business.id));
  const fixes = later(getFixesState(business.id, "/dashboard"));
  const [overview, scanStatus, sources, trends] = await Promise.all([
    getOverview(business.id),
    getScanStatus({ businessId: business.id }),
    getSources(business.id),
    getQuestionTrends(business.id),
  ]);
  if (!overview) notFound();
  const { score } = overview;
  const tools = overview.models.map((m) => m.label).join(", ");
  const meta = [
    sources?.place,
    trends ? `${trends.rows.length} customer ${trends.rows.length === 1 ? "question" : "questions"}` : null,
    tools,
    overview.lastCheckedAt ? `Last scan ${shortDay(overview.lastCheckedAt)}` : "No scans yet",
  ].filter(Boolean);
  const notes = score
    ? [
        score.coverage && { id: "score-coverage", text: score.coverage },
        score.firstResults && { id: null, text: "First results. Accuracy improves with every scan." },
        overview.ownQuestions && { id: "own-questions", text: overview.ownQuestions },
        overview.ownChain && { id: "own-chain", text: overview.ownChain },
      ].filter((n): n is { id: string | null; text: string } => !!n)
    : [];

  const rail = score ? (
    <>
      <ScoreGlance score={score} sample={!!workspace.account?.isTest} notes={notes} />
      <Suspense fallback={<RailSkeleton />}>
        <RailSection compete={compete} sources={sources} />
      </Suspense>
      {overview.nextScan && (
        <RailNotice title="Next check-in" testId="next-scan">
          Your next scan runs on {overview.nextScan}. Each scan adds a point to your chart.
        </RailNotice>
      )}
    </>
  ) : (
    <RailCard title="At a glance">
      <ScoreGauge value={null} ariaLabel="No visibility score yet" />
    </RailCard>
  );

  return (
    <CheckInLayout rail={rail}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="line-clamp-2 font-display font-semibold text-[26px] leading-tight break-words" title={business.name}>
            {business.name}
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="last-scan">
            {meta.join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:max-w-[60%] sm:justify-end">
          {score && <RangeControl days={days} />}
          {score && (
            <>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/reports">
                  <FileText aria-hidden="true" />
                  View report
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/reports?share=1">
                  <Share2 aria-hidden="true" />
                  Share
                </Link>
              </Button>
            </>
          )}
          {score && scanStatus.ok && <RunScanButton businessId={business.id} initial={scanStatus.data} start={startScan} className="h-8 rounded-full px-3.5 text-[13px]" />}
        </div>
      </header>

      {scanStatus.ok && scanStatus.data.lastResult === "failed" && !scanStatus.data.scanning && (
        <p role="status" className="rounded-[14px] bg-low-bg px-4 py-3 text-sm text-low-text">
          {/* A known reason (test mode with no sample answers) is said as it is: trying again would not help. */}
          {scanStatus.data.failedReason ?? (
            <>
              The last scan could not finish.{score ? " Your score uses the results from earlier scans." : ""} Try again in a few minutes.
            </>
          )}
        </p>
      )}

      {overview.scanNotice && !(scanStatus.ok && (scanStatus.data.scanning || scanStatus.data.lastResult === "failed")) && (
        <p role="status" className="rounded-[14px] bg-surface px-4 py-3 text-sm text-ink-2" data-testid="scan-notice">
          {overview.scanNotice}
        </p>
      )}

      {overview.lastCheckedAt && <DayRule>Your check-in, from your {shortDay(overview.lastCheckedAt)} scan</DayRule>}
      <UserBubble>How did AI do for {business.name} {days === 30 ? "this month" : `in the last ${days} days`}?</UserBubble>

      {!score ? (
        <AiMessage place="only" lead="No score yet" testId="no-score">
          {overview.ownQuestions ? (
            // Scanned, but only the user's own questions have answers, and those are not part of the score (BUG-129).
            <Explain>
              Your score counts suggested questions only, and none have answers from the last 30 days yet. <span data-testid="own-questions">{overview.ownQuestions}</span>
            </Explain>
          ) : (
            <Explain>Run your first scan to see how often ChatGPT, Claude and Perplexity recommend {business.name} when customers ask for a business like yours.</Explain>
          )}
          {scanStatus.ok && (
            <div className="grid justify-items-start gap-2.5">
              <RunScanButton
                businessId={business.id}
                initial={scanStatus.data}
                start={startScan}
                label={scanStatus.data.lastResult === null ? "Run first scan" : "Run scan"}
                className="rounded-full"
              />
              {!scanStatus.data.scanning && (
                <p className="text-xs text-muted-foreground tabular-nums" data-testid="scan-cost">
                  Takes about a minute and uses about {overview.scanCredits} {overview.scanCredits === 1 ? "credit" : "credits"}.
                </p>
              )}
            </div>
          )}
        </AiMessage>
      ) : (
        <>
          <Suspense fallback={<ThreadSkeleton />}>
            <ThreadSection overview={overview} compete={compete} sources={sources} picked={picked} trends={trends} days={days} />
          </Suspense>
          <Suspense fallback={<ActionsSkeleton />}>
            <ActionsSection businessId={business.id} board={board} fixes={fixes} />
          </Suspense>
          <Suspense fallback={null}>
            <Followups compete={compete} />
          </Suspense>
          <Composer />
        </>
      )}

      <p className="max-w-prose text-xs text-muted-foreground sm:pl-12">
        Scores come from asking each AI your customers&apos; questions with web search and your location. Answers in the ChatGPT, Claude and Perplexity apps
        can differ. No one can guarantee AI recommendations.
      </p>
    </CheckInLayout>
  );
}

/** Suggested follow-ups: pages that answer the next questions. Compare opens on the business ahead of you by default. */
async function Followups({ compete }: { compete: Promise<Awaited<ReturnType<typeof getOverviewCompete>>> }) {
  const c = await compete;
  const leader = c?.leaderName ?? null;
  return (
    <FollowUps
      items={[
        { label: "Who's ahead of me, and why?", href: "/competitors" },
        ...(leader ? [{ label: `How do I compare with ${leader}?`, href: compareHref() }] : []),
        { label: "Where does AI look?", href: "/sources" },
        { label: "What should I fix first?", href: "/actions" },
      ]}
    />
  );
}

const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
