import { PauseCircle } from "lucide-react";
import { TEST_MODE_MESSAGE } from "@/lib/test-mode";
import { sectionNumbers, visibleSections, type ReportDocument, type ReportView, type SectionId } from "@/modules/reports";
import { PreparedOn, ReportPeriod } from "./ReportDates";
import { ActionsSection, MethodSection } from "./ReportPlan";
import { ReportReady } from "./ReportReady";
import { ModelsSection, SummarySection } from "./ReportSummary";
import { CompetitorsSection, QuestionsSection, SourcesSection } from "./ReportTables";

type SectionProps = { doc: ReportDocument; number: number };

// The fixed order (dashboard redesign, 7. Reports); visibleSections keeps it whatever the agency hides.
const SECTION: Record<SectionId, (props: SectionProps) => React.ReactNode> = {
  summary: SummarySection,
  models: ModelsSection,
  competitors: CompetitorsSection,
  questions: QuestionsSection,
  sources: SourcesSection,
  actions: ActionsSection,
  method: MethodSection,
};

function toolList(doc: ReportDocument): string {
  const names = doc.models.rows.map((m) => m.label);
  return names.length <= 1 ? (names[0] ?? "AI tools") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/**
 * The client report as a document (B-59, 7. Reports). The same component on the Reports page, the share link and the
 * PDF, so all three show the same sections in the same order and leave out the same hidden ones.
 */
export function Report({ report, logoSrc }: { report: ReportView; logoSrc: string | null }) {
  const doc = report.document;
  const sections = visibleSections(report.hidden);
  const numbers = sectionNumbers(report.hidden);
  const scanned = doc.lastScanAt !== null;
  const facts = [doc.domain, doc.place, `${doc.questionCount} customer ${doc.questionCount === 1 ? "question" : "questions"} asked to ${toolList(doc)}`];

  return (
    <article className="report mx-auto flex w-full max-w-[880px] flex-col gap-10 px-4 py-8 sm:px-8 sm:py-12" data-testid="report">
      {report.agency.isTest ? (
        // Test mode (D-61): the report and its share link say the answers are samples, on screen and in the PDF.
        <p role="note" className="rounded-md border border-mid/30 bg-mid-bg px-4 py-3 text-sm font-medium text-mid-text" data-testid="report-test-mode">
          {TEST_MODE_MESSAGE}
        </p>
      ) : null}
      <header className="flex flex-col gap-6">
        <div className="flex flex-col items-start gap-2 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element -- served from our own route, sized by the agency's upload
              <img src={logoSrc} alt="" className="h-10 w-auto max-w-40 object-contain" data-testid="agency-logo" />
            )}
            <span className="min-w-0 text-sm font-semibold break-words" data-testid="agency-name">
              {report.agency.name}
            </span>
          </div>
          <span className="shrink-0 text-[13px] text-muted-foreground" data-testid="report-prepared">
            {report.kind === "snapshot" ? "Snapshot saved " : "Prepared "}
            <PreparedOn iso={doc.preparedAt} />
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-primary" data-testid="report-period">
            AI visibility report, <ReportPeriod iso={doc.preparedAt} windowDays={doc.windowDays} />
          </p>
          <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] text-balance break-words">{doc.businessName}</h1>
          <p className="text-[15px] break-words text-muted-foreground">{facts.filter(Boolean).join(" · ")}</p>
        </div>
      </header>

      {doc.paused && (
        <p role="note" className="flex items-start gap-2 rounded-md border border-border bg-muted px-4 py-3 text-sm" data-testid="report-paused">
          <PauseCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          Scans are paused for this business, so this report shows the answers saved before the pause.
        </p>
      )}

      {scanned ? (
        sections.map((id) => {
          const Section = SECTION[id];
          return <Section key={id} doc={doc} number={numbers[id]!} />;
        })
      ) : (
        <section className="report-section flex flex-col gap-2" data-testid="report-no-scans">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">No results yet</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            {doc.paused
              ? "Scans are paused, so there are no answers to report on. The report fills in after the first scan."
              : "The first scan has not finished, so there is nothing to report yet. The report fills in after it."}
          </p>
        </section>
      )}

      <footer className="border-t border-border pt-5 text-xs text-text-hint">
        <p className="max-w-prose">Scores show how often AI named each business over the last 30 days. No one can guarantee AI recommendations.</p>
      </footer>
      <ReportReady />
    </article>
  );
}
