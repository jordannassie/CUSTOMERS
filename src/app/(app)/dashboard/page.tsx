import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Share2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { RunScanButton } from "@/components/app/RunScanButton";
import { RANGES, RangeControl } from "@/components/overview/OverviewKpis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getOverviewCompete, getPickedInstead } from "@/modules/competitors";
import { getFixesState } from "@/modules/insights";
import { getScanStatus, startScan } from "@/modules/jobs";
import { getActionsBoard } from "@/modules/opportunities";
import { getOverview, getQuestionTrends } from "@/modules/overview";
import { getSources } from "@/modules/sources";
import { getWorkspace } from "@/modules/workspace";
import { QuestionsMoved } from "@/components/overview/OverviewCards";
import { SourcesActionsSection, SummarySection, ToolsSection } from "./_components/sections";
import { PairSkeleton, SummarySkeleton, ToolsSkeleton } from "./_components/section-skeletons";
import { HideableNotice } from "@/components/app/HideableNotice";

export const metadata = { title: "Overview", robots: { index: false } };

/** Started now and awaited by a streamed section; a failure still reaches that section's error boundary. */
function later<T>(promise: Promise<T>): Promise<T> {
  // Marks it handled, so a page that stops early (not found, redirect) leaves no unhandled rejection behind.
  promise.catch(() => {});
  return promise;
}

// B-49, MVP_SPEC 8.1, mockup-ui redesign: the four numbers and the score's explanation, the chart beside who AI picks
// most, the score by AI tool, where AI looks and what to do first, then which questions moved. The range changes the
// charts and counts; the score stays 30 days (D-63).
export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const asked = Number((await searchParams).range);
  const days = (RANGES as readonly number[]).includes(asked) ? asked : 30;
  const workspace = await getWorkspace({ next: "/dashboard" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  // Setup is the onboarding wizard's job (B-36); it resumes where the user stopped.
  if (!business || business.status === "onboarding") redirect("/onboarding");

  // Everything starts at once. The header and notices wait for the reads they show; the competitor blocks, the chart
  // and the fixes stream in below as each is ready (they share the score's answers through React's cache).
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

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <PageHeader
        title={business.name}
        clampTitle={business.name}
        description={meta.join(" · ")}
        descriptionTestId="last-scan"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {score && <RangeControl days={days} />}
            {score && (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/reports">
                    <FileText aria-hidden="true" />
                    View report
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/reports?share=1">
                    <Share2 aria-hidden="true" />
                    Share
                  </Link>
                </Button>
              </>
            )}
            {score && scanStatus.ok && <RunScanButton businessId={business.id} initial={scanStatus.data} start={startScan} className="h-8 px-3 text-[length:calc(13px*var(--px,1))]" />}
          </div>
        }
      />

      {scanStatus.ok && scanStatus.data.lastResult === "failed" && !scanStatus.data.scanning && (
        // A known reason (test mode with no sample answers) is said as it is: trying again would not help.
        <HideableNotice
          id="scan-failed"
          text={
            scanStatus.data.failedReason ??
            `The last scan could not finish.${score ? " Your score uses the results from earlier scans." : ""} Try again in a few minutes.`
          }
        />
      )}

      {overview.scanNotice && !(scanStatus.ok && (scanStatus.data.scanning || scanStatus.data.lastResult === "failed")) && (
        <HideableNotice id="scan-notice" text={overview.scanNotice} testId="scan-notice" />
      )}

      {!score ? (
        <Card className="py-0">
          <CardContent className="flex flex-col gap-2 py-6" data-testid="no-score">
            <p className="text-xl font-semibold tracking-[-0.02em]">No score yet</p>
            {overview.ownQuestions ? (
              // Scanned, but only the user's own questions have answers, and those are not part of the score (BUG-129).
              <p className="max-w-prose text-sm text-muted-foreground">
                Your score counts suggested questions only, and none have answers from the last 30 days yet. <span data-testid="own-questions">{overview.ownQuestions}</span>
              </p>
            ) : (
              <p className="max-w-prose text-sm text-muted-foreground">
                Run your first scan to see how often ChatGPT, Claude and Perplexity recommend {business.name} when customers ask for a business like yours.
              </p>
            )}
            {scanStatus.ok && (
              <div className="mt-3 grid justify-items-start gap-2.5">
                <RunScanButton
                  businessId={business.id}
                  initial={scanStatus.data}
                  start={startScan}
                  label={scanStatus.data.lastResult === null ? "Run first scan" : "Run scan"}
                />
                {!scanStatus.data.scanning && (
                  <p className="text-xs text-muted-foreground tabular-nums" data-testid="scan-cost">
                    Takes about a minute and uses about {overview.scanCredits} {overview.scanCredits === 1 ? "credit" : "credits"}.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Suspense fallback={<SummarySkeleton />}>
            <SummarySection overview={overview} compete={compete} sources={sources} picked={picked} days={days} />
          </Suspense>
          <Suspense fallback={<ToolsSkeleton />}>
            <ToolsSection overview={overview} compete={compete} />
          </Suspense>
          <Suspense fallback={<PairSkeleton />}>
            <SourcesActionsSection businessId={business.id} compete={compete} sources={sources} board={board} fixes={fixes} />
          </Suspense>
          <QuestionsMoved trends={trends} />
        </>
      )}

      <p className="max-w-prose text-[length:calc(11.5px*var(--px,1))] text-text-hint">
        Scores come from asking each AI your customers&apos; questions with web search and your location. Answers in the ChatGPT, Claude and Perplexity apps
        can differ. No one can guarantee AI recommendations.
      </p>
    </div>
  );
}

const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
