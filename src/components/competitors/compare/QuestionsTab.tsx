import Link from "next/link";
import { cn } from "cn";
import { SiteIcon } from "@/components/app/SiteIcon";
import { Badge } from "@/components/ui/badge";
import type { ThemeRow, WhyPanel } from "@/modules/competitors";
import { tallyResult, type TallyResult } from "@/modules/standing";
import { PILL_VARIANT } from "@/components/app/pills";

// Who wins needs a gap bigger than the margin and at least 2 answers (tallyResult), not any difference.
const RESULT: Record<TallyResult, { text: string; variant: "tint" | "secondary" }> = {
  they_win: { text: "They win", variant: PILL_VARIANT.attention },
  tie: { text: "About the same", variant: PILL_VARIANT.plain },
  you_win: { text: "You win", variant: PILL_VARIANT.plain },
  too_few: { text: "Too few answers", variant: PILL_VARIANT.plain },
};

// Less padding on a phone, so four columns fit 358px; the usual 12px from sm up.
const CELL = "px-2 py-2 font-medium sm:px-3";
const ROW = "px-2 py-2.5 align-top sm:px-3";

/** A headline above a tab's table: the count first, in the page's text colour (2026-11-18). */
function Headline({ text, testId }: { text: string | null | undefined; testId: string }) {
  return text ? (
    <p className="text-[length:calc(13.5px*var(--px,1))] font-medium" data-testid={testId}>
      {text}
    </p>
  ) : null;
}

/**
 * Question by question (Compare): how many answers named each of you over 30 days, and who won it. Above it, the tally
 * ("They win 4 questions, you win 1") and the same answers by kind of question (owner, 2026-11-18).
 */
export function QuestionsTab({ panel, summary = null, themes = null }: { panel: WhyPanel; summary?: string | null; themes?: ThemeRow[] | null }) {
  const { why } = panel;
  if (why.allQuestions.length === 0) return <p className="text-sm text-muted-foreground">Questions show here after a scan.</p>;
  return (
    <section className="flex min-w-0 flex-col gap-3" data-testid="tab-questions">
      <Headline text={summary} testId="questions-summary" />
      {themes && <ThemeTable rows={themes} name={why.name} />}
      <p className="text-sm text-muted-foreground">Each question, last 30 days. Pick one to see its answers.</p>
      {/* Fits a 390px screen: the question links to its answers (no extra column), cells pad less on a phone and the
          result can wrap. Anything wider still scrolls inside this box, never the page. */}
      <div className="max-w-full overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className={CELL}>Question</th>
              <th className={cn(CELL, "text-right")}>{why.name}</th>
              <th className={cn(CELL, "text-right text-primary")}>You</th>
              <th className={CELL}>Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {why.allQuestions.map((q) => {
              const r = RESULT[tallyResult(q)];
              return (
                <tr key={q.questionId} data-testid="compare-question">
                  <td className={cn(ROW, "break-words")}>
                    <Link prefetch={false} href={`/questions?q=${q.questionId}`} className="hover:text-primary hover:underline">
                      {q.question}
                    </Link>
                  </td>
                  <td className={cn(ROW, "text-right tabular-nums whitespace-nowrap")}>
                    {q.them} of {q.answers}
                  </td>
                  <td className={cn(ROW, "text-right font-medium text-primary tabular-nums whitespace-nowrap")}>
                    {q.you} of {q.answers}
                  </td>
                  <td className={ROW}>
                    <Badge variant={r.variant} className="h-auto whitespace-normal">
                      {r.text}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The same answers grouped by what the questions ask about (price, quality, near me...). */
function ThemeTable({ rows, name }: { rows: ThemeRow[]; name: string }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-md border border-border" data-testid="question-themes">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className={CELL}>By kind of question</th>
            <th className={cn(CELL, "text-right")}>{name}</th>
            <th className={cn(CELL, "text-right text-primary")}>You</th>
            <th className={CELL}>Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((t) => {
            const r = RESULT[t.result];
            return (
              <tr key={t.theme} data-testid="question-theme">
                <td className={ROW}>
                  {t.label} <span className="text-xs text-muted-foreground">({t.questions} {t.questions === 1 ? "question" : "questions"})</span>
                </td>
                <td className={cn(ROW, "text-right tabular-nums whitespace-nowrap")}>
                  {t.them} of {t.answers}
                </td>
                <td className={cn(ROW, "text-right font-medium text-primary tabular-nums whitespace-nowrap")}>
                  {t.you} of {t.answers}
                </td>
                <td className={ROW}>
                  <Badge variant={r.variant} className="h-auto whitespace-normal">
                    {r.text}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Where AI looked (Compare): each site the answers used, and how many of those answers named each of you. */
export function WhereLookedTab({ panel, summary = null }: { panel: WhyPanel; summary?: string | null }) {
  const { why } = panel;
  if (why.domains.length === 0) return <p className="text-sm text-muted-foreground">No sites cited in these answers yet.</p>;
  return (
    <section className="flex min-w-0 flex-col gap-3" data-testid="tab-sources">
      <Headline text={summary} testId="sites-summary" />
      <p className="text-sm text-muted-foreground">Sites AI used in answers to your questions, and who it named from them.</p>
      {/* Same as the questions table: short headers that wrap, long hosts break, and it scrolls in its own box. */}
      <div className="max-w-full overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className={CELL}>Site</th>
              <th className={cn(CELL, "text-right")}>Answers that used it</th>
              <th className={cn(CELL, "text-right")}>Named {why.name}</th>
              <th className={cn(CELL, "text-right text-primary")}>Named you</th>
              <th className={CELL}>Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {why.domains.map((d) => {
              const r = RESULT[d.result];
              return (
                <tr key={d.host} data-testid="compare-site">
                  <td className={cn(ROW, "font-medium break-all")}>
                    <span className="flex items-center gap-2">
                      <SiteIcon domain={d.host} name={d.host} size="sm" />
                      <Link prefetch={false} href={`/questions?site=${encodeURIComponent(d.host)}`} className="min-w-0 hover:underline">
                        {d.host}
                      </Link>
                    </span>
                  </td>
                  <td className={cn(ROW, "text-right tabular-nums")}>{d.answers}</td>
                  <td className={cn(ROW, "text-right tabular-nums")}>{d.them}</td>
                  <td className={cn(ROW, "text-right font-medium text-primary tabular-nums")}>{d.you}</td>
                  <td className={ROW}>
                    <Badge variant={r.variant} className="h-auto whitespace-normal">
                      {r.text}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
