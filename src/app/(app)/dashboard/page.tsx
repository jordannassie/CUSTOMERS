import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RunScanButton } from "@/components/app/RunScanButton";
import { ExportPdfButton } from "@/components/report/ExportPdfButton";
import { ShareButton } from "@/components/report/ShareButton";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelScores } from "@/components/overview/ModelScores";
import { ScoreSummary } from "@/components/overview/ScoreSummary";
import { OPPORTUNITIES_HREF, TopOpportunities } from "@/components/overview/TopOpportunities";
import { TrendChart } from "@/components/overview/TrendChart";
import { getScanStatus, startScan } from "@/modules/jobs";
import { getOverview } from "@/modules/overview";
import { createShareLink, exportPdf, getShareLink, revokeShareLink } from "@/modules/reports";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Overview", robots: { index: false } };

// B-49, MVP_SPEC 8.1: score, trend, per-model scores, what to fix first, and Run scan.
export default async function OverviewPage() {
  const workspace = await getWorkspace({ next: "/dashboard" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  // Setup is the onboarding wizard's job (B-36); it resumes where the user stopped.
  if (!business || business.status === "onboarding") redirect("/onboarding");

  const [overview, scanStatus, shareLink] = await Promise.all([
    getOverview(business.id),
    getScanStatus({ businessId: business.id }),
    getShareLink(business.id),
  ]);
  if (!overview) notFound();
  const { score } = overview;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-5 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.02em]">{business.name}</h1>
          <p className="text-sm text-muted-foreground" data-testid="last-scan">
            {overview.lastCheckedAt ? `Last scan ${timeAgo(new Date(overview.lastCheckedAt))}` : "No scans yet"}
          </p>
        </div>
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
      </header>

      {scanStatus.ok && scanStatus.data.lastResult === "failed" && !scanStatus.data.scanning && (
        <p role="status" className="rounded-md border border-border bg-mid-bg px-4 py-3 text-sm text-mid-text">
          The last scan could not finish.{score ? " Your score uses the results from earlier scans." : ""} Try Run scan
          again in a few minutes.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visibility score, last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            {score ? (
              <>
                <ScoreSummary score={score} />
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-medium">Last 7 days</h2>
                  <TrendChart trend={overview.trend} />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 py-6" data-testid="no-score">
                <p className="text-xl font-semibold tracking-[-0.02em]">No score yet</p>
                <p className="max-w-prose text-sm text-muted-foreground">
                  Run your first scan to see how often ChatGPT, Claude and Perplexity recommend {business.name} when
                  customers ask for a business like yours. Results appear in about a minute.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score by AI</CardTitle>
          </CardHeader>
          <CardContent>
            <ModelScores models={overview.models} />
          </CardContent>
        </Card>
      </div>

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
          <TopOpportunities opportunities={overview.opportunities} hasScore={score !== null} />
        </CardContent>
      </Card>

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
