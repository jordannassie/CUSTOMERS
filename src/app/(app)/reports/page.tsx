import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileClock, FileText } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { ReportBranding } from "@/components/report/ReportBranding";
import { ReportFixes } from "@/components/report/ReportFixes";
import { ReportOverview } from "@/components/report/ReportOverview";
import { ReportsHeader } from "@/components/report/ReportsHeader";
import { SavedReports } from "@/components/report/SavedReports";
import { Button } from "@/components/ui/button";
import {
  createShareLink,
  exportPdf,
  getReportsPage,
  removeSnapshot,
  reportParam,
  revokeShareLink,
  saveReportBranding,
  saveSnapshot,
} from "@/modules/reports";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Reports", robots: { index: false } };

type Props = { searchParams: Promise<{ report?: string | string[]; share?: string | string[] }> };

// Reports (D-90): the shown report's summary and its fixes (each opens in place), Download PDF, Copy email summary, the
// share link, the saved snapshots and the agency's branding. /reports?share=1 (the Overview's Share) opens the share panel.
export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const reportId = reportParam.parse(params.report);
  const workspace = await getWorkspace({ next: "/reports" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/onboarding");

  const page = await getReportsPage(business.id, reportId);
  // A report of another business (after switching) or one deleted in another tab: back to the latest report.
  if (page === "missing") redirect("/reports");
  if (!page) notFound();
  const { shown } = page;
  const report = typeof shown === "object" ? shown : null;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <ReportsHeader
          key={`${business.id}-${reportId ?? "latest"}`}
          businessId={business.id}
          reportId={reportId}
          summary={report?.summary ?? null}
          initialLink={page.share}
          openShare={params.share === "1"}
          create={createShareLink}
          revoke={revokeShareLink}
          exportPdf={exportPdf}
        />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            {report ? (
              <>
                <ReportOverview report={report} saved={reportId !== null} />
                <ReportFixes key={report.id} fixes={report.fixes} none={report.short.fixes} />
              </>
            ) : shown === "old" ? (
              <section className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-5" data-testid="report-old">
                <FileClock aria-hidden className="size-6 text-muted-foreground" />
                <h2 className="text-base font-semibold tracking-[-0.02em]">This report uses the old layout</h2>
                <p className="max-w-[560px] text-sm text-muted-foreground">
                  It was saved before reports became PDFs, so it can&apos;t be downloaded. Open the latest report and save a new
                  snapshot to get a PDF.
                </p>
                <Button asChild variant="outline" className="w-fit">
                  <Link href="/reports">Open the latest report</Link>
                </Button>
              </section>
            ) : (
              <section className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-5" data-testid="reports-empty">
                <FileText aria-hidden className="size-6 text-muted-foreground" />
                <h2 className="text-base font-semibold tracking-[-0.02em]">{business.status === "paused" ? "Scans are paused" : "No report yet"}</h2>
                <p className="max-w-[560px] text-sm text-muted-foreground">
                  {business.status === "paused"
                    ? `Scans are paused for ${business.name}, so there are no answers to report on yet. The report fills in after scans start again.`
                    : `Your first report appears here after the first scan of ${business.name} finishes. Run it from the Overview.`}
                </p>
                <Button asChild className="w-fit">
                  <Link href="/dashboard">Go to Overview</Link>
                </Button>
              </section>
            )}
          </div>
          <aside className="flex min-w-0 flex-col gap-6" aria-label="Saved reports and branding">
            <SavedReports
              key={business.id}
              businessId={business.id}
              reports={page.reports}
              selected={reportId}
              canSave={shown !== "empty"}
              save={saveSnapshot}
              remove={removeSnapshot}
            />
            <ReportBranding agencyName={page.agencyName} logoSrc={page.logoSrc} branding={page.branding} save={saveReportBranding} />
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
