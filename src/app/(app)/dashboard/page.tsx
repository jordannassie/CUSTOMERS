import Link from "next/link";
import { SampleDataBadge } from "@/components/app/SampleDataBadge";
import { notFound, redirect } from "next/navigation";
import { RunScanButton } from "@/components/app/RunScanButton";
import { PickedInstead } from "@/components/competitors/PickedInstead";
import { ExportPdfButton } from "@/components/report/ExportPdfButton";
import { ShareButton } from "@/components/report/ShareButton";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelScores, ModelScoresRow } from "@/components/overview/ModelScores";
import { ScoreSummary } from "@/components/overview/ScoreSummary";
import { OPPORTUNITIES_HREF, TopOpportunities } from "@/components/overview/TopOpportunities";
import { QuestionTrends } from "@/components/overview/QuestionTrends";
import { TrendChart } from "@/components/overview/TrendChart";
import { getPickedInstead } from "@/modules/competitors";
import { getScanStatus, startScan } from "@/modules/jobs";
import { checkFixes, getFixesState } from "@/modules/insights";
import { getOverview, getQuestionTrends } from "@/modules/overview";
import { createShareLink, exportPdf, getShareLink, revokeShareLink } from "@/modules/reports";
import { getWorkspace } from "@/modules/workspace";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata = { title: "Overview", robots: { index: false } };

// B-49, MVP_SPEC 8.1: score, trend, per-model scores, what to fix first, and Run scan.
export default async function OverviewPage() {
  const workspace = await getWorkspace({ next: "/dashboard" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  // Setup is the onboarding wizard's job (B-36); it resumes where the user stopped.
  if (!business || business.status === "onboarding") redirect("/onboarding");

  const [overview, scanStatus, shareLink, picked, trends, fixes] = await Promise.all([
    getOverview(business.id),
    getScanStatus({ businessId: business.id }),
    getShareLink(business.id),
    getPickedInstead(business.id),
    getQuestionTrends(business.id),
    getFixesState(business.id, "/dashboard"),
  ]);
  if (!overview) notFound();
  const { score } = overview;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-5 sm:p-8">
      {/* Two lines at most; under 640px the buttons sit on their own row below, so the name has the full width. */}
      <PageHeader
        title={business.name}
        clampTitle={business.name}
        description={overview.lastCheckedAt ? `Last scan ${timeAgo(new Date(overview.lastCheckedAt))}` : "No scans yet"}
        descriptionTestId="last-scan"
        actions={
          // Before the first score Run scan sits in the empty card, and there is nothing to share or export yet.
          score && (
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row-reverse sm:flex-wrap sm:items-start">
            {scanStatus.ok && (
              <RunScanButton
                businessId={business.id}
                initial={scanStatus.data}
                start={startScan}
                getStatus={getScanStatus}
                className="col-span-2"
              />
            )}
            <ShareButton businessId={business.id} initial={shareLink} create={createShareLink} revoke={revokeShareLink} />
            <ExportPdfButton businessId={business.id} exportPdf={exportPdf} />
          </div>
          )
        }
      />

      {scanStatus.ok && scanStatus.data.lastResult === "failed" && !scanStatus.data.scanning && (
        <p role="status" className="rounded-md border border-border bg-mid-bg px-4 py-3 text-sm text-mid-text">
          {/* A known reason (test mode with no sample answers) is said as it is: trying again would not help. */}
          {scanStatus.data.failedReason ?? (
            <>
              The last scan could not finish.{score ? " Your score uses the results from earlier scans." : ""} Try again in a few
              minutes.
            </>
          )}
        </p>
      )}

      {overview.scanNotice && !(scanStatus.ok && (scanStatus.data.scanning || scanStatus.data.lastResult === "failed")) && (
        <p role="status" className="rounded-md border border-border bg-mid-bg px-4 py-3 text-sm text-mid-text" data-testid="scan-notice">
          {overview.scanNotice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Visibility score, last 30 days <SampleDataBadge show={workspace.account?.isTest} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            {score ? (
              <>
                <ScoreSummary score={score} ownQuestions={overview.ownQuestions} ownChain={overview.ownChain} />
                <ModelScoresRow models={overview.models} className="sm:hidden" />
                <TrendChart trend={overview.trend} />
              </>
            ) : (
              <div className="flex flex-col gap-2 py-6" data-testid="no-score">
                <p className="text-xl font-semibold tracking-[-0.02em]">No score yet</p>
                {overview.ownQuestions ? (
                  // Scanned, but only the user's own questions have answers, and those are not part of the score (BUG-129).
                  <p className="max-w-prose text-sm text-muted-foreground">
                    Your score counts suggested questions only, and none have answers from the last 30 days yet.{" "}
                    <span data-testid="own-questions">{overview.ownQuestions}</span>
                  </p>
                ) : (
                  <p className="max-w-prose text-sm text-muted-foreground">
                    Run your first scan to see how often ChatGPT, Claude and Perplexity recommend {business.name} when
                    customers ask for a business like yours.
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
                        Takes about a minute and uses about {overview.scanCredits}{" "}
                        {overview.scanCredits === 1 ? "credit" : "credits"}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* On phones the row under the score shows these instead, unless there is no score yet. */}
        <Card className={score ? "max-sm:hidden" : undefined}>
          <CardHeader>
            <CardTitle className="text-base">Score by AI</CardTitle>
          </CardHeader>
          <CardContent>
            <ModelScores models={overview.models} />
          </CardContent>
        </Card>
      </div>

      {score && picked && <PickedInstead picked={picked} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What to fix first</CardTitle>
          {overview.opportunities.length > 0 && (
            <CardAction>
              <Link href={OPPORTUNITIES_HREF} className="text-sm font-medium text-primary hover:underline">
                See all opportunities
              </Link>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <TopOpportunities
            opportunities={overview.opportunities}
            hasScore={score !== null}
            wait={fixes?.pending ? { businessId: business.id, check: checkFixes } : null}
          />
        </CardContent>
      </Card>

      {trends && <QuestionTrends trends={trends} businessName={business.name} />}

      <p className="max-w-prose text-xs text-text-hint">
        Scores come from asking each AI your customers&apos; questions with web search and your location. Answers in the
        ChatGPT, Claude and Perplexity apps can differ. No one can guarantee AI recommendations.
      </p>
    </div>
  );
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

function timeAgo(date: Date): string {
  const ms = date.getTime() - Date.now();
  const format = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, size] of UNITS) if (Math.abs(ms) >= size) return format.format(Math.round(ms / size), unit);
  return "just now";
}
