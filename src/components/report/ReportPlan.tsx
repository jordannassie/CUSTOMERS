import { Badge } from "@/components/ui/badge";
import type { ReportDocument } from "@/modules/reports";
import { Empty, IMPACT, ReportSection } from "./ReportSection";

/** 6. Action plan: the open fixes, numbered, most important first, each with where to make it and why. */
export function ActionsSection({ doc, number }: { doc: ReportDocument; number: number }) {
  const { rows } = doc.actions;
  return (
    <ReportSection id="actions" number={number} label="Action plan" headline="What to fix and where">
      {rows.length > 0 ? (
        <ol className="flex flex-col divide-y divide-border" data-testid="report-opportunities">
          {rows.map((row, i) => (
            <li key={`${i}-${row.title}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span className="w-5 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}.</span>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold break-words">{row.title}</span>
                  <Badge variant={IMPACT[row.impact].variant}>{IMPACT[row.impact].label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Where:</span> {row.where.replace(/\.$/, "")}.
                  {row.why && (
                    <>
                      {" "}
                      <span className="font-medium text-foreground">Why:</span> {row.why.replace(/\s+/g, " ")}
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty>Nothing to fix right now. New fixes appear here after a scan shows why AI picks other businesses.</Empty>
      )}
    </ReportSection>
  );
}

const list = (names: string[]) => (names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

/** 7. How we measure: what was asked, how, and what the score means. */
export function MethodSection({ doc, number }: { doc: ReportDocument; number: number }) {
  const tools = list(doc.models.rows.map((m) => m.label)) || "ChatGPT, Claude and Perplexity";
  return (
    <ReportSection id="method" number={number} label="How we measure">
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        We asked {tools} the same questions local customers ask{doc.place ? `, from ${doc.place},` : ","} through each
        tool&apos;s official developer service with web search on. The visibility score is the share of answers in the
        last {doc.windowDays} days that named {doc.businessName}. Answers in the apps themselves can differ, so no one can
        promise a placement.
      </p>
    </ReportSection>
  );
}
