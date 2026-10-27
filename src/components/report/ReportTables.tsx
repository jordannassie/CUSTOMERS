import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { cn } from "cn";
import type { QuestionLine, ReportDocument } from "@/modules/reports";
import { DocTable, Empty, ReportSection, StandingPill } from "./ReportSection";

const answers = (n: number) => `${n} ${n === 1 ? "answer" : "answers"}`;

/** 3. Competitors: score, share of AI picks, the shared status pill, and the top likely reason from saved answers. */
export function CompetitorsSection({ doc, number }: { doc: ReportDocument; number: number }) {
  const { rows, hasReasons, headline } = doc.competitors;
  return (
    <ReportSection id="competitors" number={number} label="Competitors" headline={headline}>
      {rows.some((r) => !r.isYou) ? (
        <DocTable
          label="Competitors"
          head={
            <>
              <th scope="col">Business</th>
              <th scope="col" className="text-right">Score</th>
              <th scope="col" className="text-right">Share of AI picks</th>
              <th scope="col">Status</th>
              {hasReasons && <th scope="col">Main reason</th>}
            </>
          }
        >
          {rows.map((row) => (
            <tr key={row.name} className={cn(row.isYou && "bg-primary-tint")} data-testid="report-competitor">
              <td className={cn("font-medium break-words", row.isYou && "text-primary-hover")}>{row.name}</td>
              <td className="text-right tabular-nums">{row.score ?? <span className="text-text-hint">Not yet</span>}</td>
              <td className="text-right tabular-nums">{row.share === null ? <span className="text-text-hint">Not yet</span> : `${row.share}%`}</td>
              <td>
                <StandingPill row={row} />
              </td>
              {hasReasons && <td className="text-muted-foreground">{row.reason}</td>}
            </tr>
          ))}
        </DocTable>
      ) : (
        <Empty>No competitors are tracked for this business yet.</Empty>
      )}
    </ReportSection>
  );
}

const TREND = {
  up: { icon: ArrowUp, text: "Up", className: "text-good-text" },
  down: { icon: ArrowDown, text: "Down", className: "text-low-text" },
  same: { icon: ArrowRight, text: "Same", className: "text-muted-foreground" },
} as const;

function Trend({ trend }: { trend: QuestionLine["trend"] }) {
  if (!trend) return <span className="text-text-hint">After the next scan</span>;
  const { icon: Icon, text, className } = TREND[trend];
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", className)}>
      <Icon aria-hidden className="size-3.5" />
      {text}
    </span>
  );
}

/** 4. Questions: how often AI named the business on each suggested question, and its move at the latest scan. */
export function QuestionsSection({ doc, number }: { doc: ReportDocument; number: number }) {
  const { rows, headline } = doc.questions;
  return (
    <ReportSection id="questions" number={number} label="Questions" headline={headline}>
      {rows.length > 0 ? (
        <DocTable
          label="Questions"
          head={
            <>
              <th scope="col">Question</th>
              <th scope="col" className="text-right">Named you</th>
              <th scope="col">Trend</th>
            </>
          }
        >
          {rows.map((row) => (
            <tr key={row.question} data-testid="report-question">
              <td className="break-words">{row.question}</td>
              <td className="text-right whitespace-nowrap tabular-nums">
                {row.answers === 0 ? <span className="text-text-hint">No answers yet</span> : `${row.named} of ${answers(row.answers)}`}
              </td>
              <td className="whitespace-nowrap">
                <Trend trend={row.trend} />
              </td>
            </tr>
          ))}
        </DocTable>
      ) : (
        <Empty>No questions are being asked for this business yet.</Empty>
      )}
    </ReportSection>
  );
}

/** 5. Where AI looks: the sites its answers used most, and how many of those answers named the business. */
export function SourcesSection({ doc, number }: { doc: ReportDocument; number: number }) {
  const { rows, headline, answers: total } = doc.sources;
  return (
    <ReportSection id="sources" number={number} label="Where AI looks" headline={headline}>
      {rows.length > 0 ? (
        <>
          <DocTable
            label="Where AI looks"
            head={
              <>
                <th scope="col">Site</th>
                <th scope="col" className="text-right">Answers that used it</th>
                <th scope="col" className="text-right">Named you</th>
              </>
            }
          >
            {rows.map((row) => (
              <tr key={row.host} data-testid="report-source">
                <td className="font-medium break-all">
                  {row.host}
                  {row.own && <span className="ml-2 text-xs font-normal text-muted-foreground">Your website</span>}
                </td>
                <td className="text-right tabular-nums">{row.answers}</td>
                <td className={cn("text-right tabular-nums", row.namedYou === 0 && "text-low-text")}>{row.namedYou}</td>
              </tr>
            ))}
          </DocTable>
          <p className="text-xs text-text-hint">Out of {answers(total)} in the last 30 days. One answer can use several sites.</p>
        </>
      ) : (
        <Empty>No answers have used a website yet.</Empty>
      )}
    </ReportSection>
  );
}
