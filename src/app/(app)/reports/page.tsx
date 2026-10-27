import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { Report } from "@/components/report/Report";
import { ReportBranding } from "@/components/report/ReportBranding";
import { ReportsHeader } from "@/components/report/ReportsHeader";
import { SavedReports } from "@/components/report/SavedReports";
import { SectionToggles } from "@/components/report/SectionToggles";
import { Button } from "@/components/ui/button";
import {
  createShareLink,
  exportPdf,
  getReportsPage,
  removeSnapshot,
  reportParam,
  revokeShareLink,
  saveReportSections,
  saveSnapshot,
} from "@/modules/reports";
import { getWorkspace } from "@/modules/workspace";

export const metadata = { title: "Reports", robots: { index: false } };

type Props = { searchParams: Promise<{ report?: string | string[]; share?: string | string[] }> };

// Dashboard redesign, 7. Reports: the client report as a document, with saved snapshots, section toggles, branding,
// a read-only share link and the PDF. /reports?share=1 (the Overview's Share) opens the share panel.
export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const reportId = reportParam.parse(params.report);
  const workspace = await getWorkspace({ next: "/reports" });
  const business = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  if (!business || business.status === "onboarding") redirect("/onboarding");

  const page = await getReportsPage(business.id, reportId);
  // A snapshot of another business (after switching) or one deleted in another tab: back to the live report.
  if (page === "missing") redirect("/reports");
  if (!page) notFound();
  const { view } = page;
  const ready = view.document.lastScanAt !== null;

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <ReportsHeader
          key={`${business.id}-${reportId ?? "live"}`}
          businessId={business.id}
          reportId={reportId}
          ready={ready}
          initialLink={page.share}
          openShare={params.share === "1"}
          create={createShareLink}
          revoke={revokeShareLink}
          exportPdf={exportPdf}
        />

        {ready ? (
          <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-6" aria-label="Report options">
              <SavedReports
                key={business.id}
                businessId={business.id}
                reports={page.saved}
                selected={reportId}
                canSave={view.document.summary.score !== null}
                save={saveSnapshot}
                remove={removeSnapshot}
              />
              <SectionToggles key={`sections-${business.id}`} businessId={business.id} initialHidden={view.hidden} save={saveReportSections} />
              <ReportBranding agencyName={view.agency.name} logoSrc={page.logoSrc} />
            </aside>
            <div className="min-w-0 rounded-md border border-border bg-surface">
              <Report report={view} logoSrc={page.logoSrc} />
            </div>
          </div>
        ) : (
          <section className="flex flex-col items-start gap-3 rounded-md border border-border bg-surface p-5" data-testid="reports-empty">
            <FileText aria-hidden className="size-6 text-muted-foreground" />
            <h2 className="text-base font-semibold tracking-[-0.02em]">{view.document.paused ? "Scans are paused" : "No report yet"}</h2>
            <p className="max-w-[560px] text-sm text-muted-foreground">
              {view.document.paused
                ? `Scans are paused for ${business.name}, so there are no answers to report on yet. The report fills in after scans start again.`
                : `Your first report appears here after the first scan of ${business.name} finishes. Run it from the Overview.`}
            </p>
            <Button asChild className="w-fit">
              <Link href="/dashboard">Go to Overview</Link>
            </Button>
          </section>
        )}
      </div>
    </PageContainer>
  );
}
