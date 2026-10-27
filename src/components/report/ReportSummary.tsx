import type { ReactNode } from "react";
import { cn } from "cn";
import { ModelScores } from "@/components/overview/ModelScores";
import type { ReportDocument } from "@/modules/reports";
import { Empty, ReportSection } from "./ReportSection";

const TONE_TEXT = { good: "text-good-text", mid: "text-mid-text", low: "text-low-text" } as const;

function Fact({ label, value, note, testId }: { label: string; value: ReactNode; note?: ReactNode; testId: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md border border-border p-4" data-testid={testId}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">{value}</span>
      {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
    </div>
  );
}

function rankNote(rank: NonNullable<ReportDocument["summary"]["rank"]>): string {
  if (rank.total === 1) return "No competitors tracked yet";
  return rank.leader ? `Leader: ${rank.leader.name}, ${rank.leader.score}` : "You lead the tracked businesses";
}

/** 1. Summary: the headline, three facts and a short plain paragraph from the numbers (DB-012). */
export function SummarySection({ doc, number }: { doc: ReportDocument; number: number }) {
  const { summary } = doc;
  const { score, rank, citations } = summary;
  return (
    <ReportSection id="summary" number={number} label="Summary" headline={summary.headline}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Fact
          testId="fact-score"
          label="Visibility score"
          value={
            score ? (
              <>
                <span className={cn(TONE_TEXT[score.tone])}>{score.value}</span>
                <span className="text-sm font-normal text-muted-foreground"> / 100</span>
              </>
            ) : (
              <span className="text-base font-medium">Not yet</span>
            )
          }
          note={score?.label ?? "Appears after the first scan"}
        />
        <Fact
          testId="fact-rank"
          label="Rank among tracked businesses"
          value={rank ? `#${rank.position} of ${rank.total}` : <span className="text-base font-medium">Not yet</span>}
          note={rank ? rankNote(rank) : "Appears after the first scan"}
        />
        <Fact
          testId="fact-citations"
          label="Website cited by AI"
          value={
            citations.hasSite ? (
              `${citations.cited} ${citations.cited === 1 ? "time" : "times"}`
            ) : (
              <span className="text-base font-medium">No website saved</span>
            )
          }
          note={citations.hasSite ? `in ${citations.answers} ${citations.answers === 1 ? "answer" : "answers"}` : undefined}
        />
      </div>
      {summary.lines.length > 0 && (
        <p className="max-w-prose text-[15px] leading-relaxed" data-testid="report-summary">
          {summary.lines.join(" ")}
        </p>
      )}
    </ReportSection>
  );
}

/** 2. Score by AI tool, with the same bars as the Overview. */
export function ModelsSection({ doc, number }: { doc: ReportDocument; number: number }) {
  return (
    <ReportSection id="models" number={number} label="Score by AI tool" headline={doc.models.headline}>
      {doc.models.rows.length > 0 ? (
        <div className="max-w-xl">
          <ModelScores models={doc.models.rows} />
        </div>
      ) : (
        <Empty>No AI tools are chosen for this business.</Empty>
      )}
    </ReportSection>
  );
}
