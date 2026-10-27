import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Share2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { RunScanButton } from "@/components/app/RunScanButton";
import { QuestionsMoved, ToolScores, TopActions, WhereAiLooks, WhereYouStand } from "@/components/overview/OverviewCards";
import { OverviewHero } from "@/components/overview/OverviewHero";
import { RANGES, RangeControl, sourceLines } from "@/components/overview/OverviewKpis";
import { ScanChart } from "@/components/overview/ScanChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOverviewCompete } from "@/modules/competitors";
import { getScanStatus, startScan } from "@/modules/jobs";
import { getActionsBoard } from "@/modules/opportunities";
import { getOverview, getQuestionTrends } from "@/modules/overview";
import { getSources } from "@/modules/sources";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Overview", robots: { index: false } };

const OPEN = new Set(["suggested", "todo", "in_progress"]);

// B-49, MVP_SPEC 8.1, dashboard redesign (2026-10-27): the score and its movement, where you stand, what to do first,
// which questions moved and where AI looks. The range changes the charts and counts; the score stays 30 days (D-63).
export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const asked = Number((await searchParams).range);
  const days = (RANGES as readonly number[]).includes(asked) ? asked : 30;
  const workspace = await getWorkspace({ next: "/dashboard" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  // Setup is the onboarding wizard's job (B-36); it resumes where the user stopped.
  if (!business || business.status === "onboarding") redirect("/onboarding");

  const [overview, scanStatus, compete, board, sources, trends] = await Promise.all([
    getOverview(business.id),
    getScanStatus({ businessId: business.id }),
    getOverviewCompete(business.id, days),
    getActionsBoard(business.id),
    getSources(business.id),
    getQuestionTrends(business.id),
  ]);
  if (!overview) notFound();
  const { score } = overview;
  const open = (board?.items ?? []).filter((a) => OPEN.has(a.status));
  const tools = overview.models.map((m) => m.label).join(", ");
  const meta = [
    sources?.place,
    trends ? `${trends.rows.length} customer ${trends.rows.length === 1 ? "question" : "questions"}` : null,
    tools,
    overview.lastCheckedAt ? `Last scan ${shortDay(overview.lastCheckedAt)}` : "No scans yet",
  ].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-5 sm:p-8">
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
                <Button asChild variant="outline">
                  <Link href="/reports">
                    <FileText aria-hidden="true" />
                    View report
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/reports?share=1">
                    <Share2 aria-hidden="true" />
                    Share
                  </Link>
                </Button>
              </>
            )}
            {score && scanStatus.ok && <RunScanButton businessId={business.id} initial={scanStatus.data} start={startScan} getStatus={getScanStatus} />}
          </div>
        }
      />

      {scanStatus.ok && scanStatus.data.lastResult === "failed" && !scanStatus.data.scanning && (
        <p role="status" className="rounded-md border border-border bg-mid-bg px-4 py-3 text-sm text-mid-text">
          {/* A known reason (test mode with no sample answers) is said as it is: trying again would not help. */}
          {scanStatus.data.failedReason ?? (
            <>
              The last scan could not finish.{score ? " Your score uses the results from earlier scans." : ""} Try again in a few minutes.
            </>
          )}
        </p>
      )}

      {overview.scanNotice && !(scanStatus.ok && (scanStatus.data.scanning || scanStatus.data.lastResult === "failed")) && (
        <p role="status" className="rounded-md border border-border bg-mid-bg px-4 py-3 text-sm text-mid-text" data-testid="scan-notice">
          {overview.scanNotice}
        </p>
      )}

      {!score ? (
        <Card>
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
                  getStatus={getScanStatus}
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
          <OverviewHero
            score={score}
            compete={compete}
            sources={sources}
            sample={!!workspace.account?.isTest}
            ownQuestions={overview.ownQuestions}
            ownChain={overview.ownChain}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visibility at each scan</CardTitle>
                <CardDescription>Share of each scan&apos;s answers that named each business, last {days} days. Pick a name to hide or show its line.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScanChart timeline={compete?.timeline ?? []} lines={compete?.lines ?? []} />
              </CardContent>
            </Card>
            <ToolScores models={overview.models} context={compete?.modelContext ?? {}} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <WhereYouStand rows={compete?.stand ?? []} lines={compete?.lines ?? []} />
            <TopActions items={open.slice(0, 3)} total={open.length} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <QuestionsMoved trends={trends} />
            <WhereAiLooks rows={sourceLines(sources)} />
          </div>
        </>
      )}

      <p className="max-w-prose text-xs text-text-hint">
        Scores come from asking each AI your customers&apos; questions with web search and your location. Answers in the ChatGPT, Claude and Perplexity apps
        can differ. No one can guarantee AI recommendations.
      </p>
    </div>
  );
}

const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
