import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollToNewest } from "./ScrollToNewest";
import { placeText, type AveragePlace, type Mover, type QuestionTrends as Trends, type TrendCell, type TrendRow } from "@/modules/scanning";

// Up or down per question (2026-10-13): each active question at the last 6 weekly scans, and the questions that moved
// most over 4 weeks. Saved results only.

const dateLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const outOf = ({ named, checked }: { named: number; checked: number }) => `${named} of ${checked}`;

export function QuestionTrends({ trends, businessName }: { trends: Trends; businessName: string }) {
  const { scans } = trends;
  // Only with SHOW_POSITION (D-63): where AI listed the business. Never called a rank.
  const places = trends.averagePlace !== undefined;
  return (
    <Card data-testid="question-trends">
      <CardHeader>
        <CardTitle className="text-base">Question by question</CardTitle>
        <CardDescription>
          How many of the AI tools named {businessName} for each question, at each weekly scan.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Each question&apos;s results show here after your first scan.</p>
        ) : (
          <>
            {places && <AveragePlaceLine average={trends.averagePlace ?? null} businessName={businessName} />}
            {scans.length < 2 ? (
              <p className="text-sm text-muted-foreground">Up or down shows from your second weekly scan.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                <Movers title="Getting better" movers={trends.better} up empty="No question has gone up in the last 4 weeks." />
                <Movers title="Getting worse" movers={trends.worse} up={false} empty="No question has gone down in the last 4 weeks." />
              </div>
            )}
            {trends.rows.length > 0 && <TrendTable caption="Questions in your score" rows={trends.rows} scans={scans} places={places} />}
            {trends.own.length > 0 && (
              <div className="flex flex-col gap-3" data-testid="own-question-trends">
                <div>
                  <h3 className="text-sm font-medium">Your own questions</h3>
                  <p className="text-sm text-muted-foreground">Not part of the score.</p>
                </div>
                <TrendTable caption="Your own questions" rows={trends.own} scans={scans} places={places} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Movers({ title, movers, up, empty }: { title: string; movers: Mover[]; up: boolean; empty: string }) {
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <section aria-label={title} className="flex flex-col gap-3" data-testid={up ? "getting-better" : "getting-worse"}>
      <h3 className="text-sm font-medium">{title}</h3>
      {movers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {movers.map((m) => (
            <li key={m.id} className="flex gap-2.5">
              <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", up ? "text-good-text" : "text-low-text")} />
              <div className="min-w-0 text-sm">
                <p className="break-words">{m.prompt}</p>
                <p className="text-muted-foreground tabular-nums">
                  Named by {outOf(m.now)} AI tools now, {outOf(m.then)} on {dateLabel(m.thenAt)}
                  {m.own ? ". Your own question" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AveragePlaceLine({ average, businessName }: { average: AveragePlace | null; businessName: string }) {
  return (
    <p className="text-sm tabular-nums" data-testid="average-place">
      {average
        ? `When AI lists businesses, ${businessName} is named at place ${average.value} on average, in ${average.answers} ${average.answers === 1 ? "answer" : "answers"} over the last 30 days.`
        : `${businessName} was not named in an AI list in the last 30 days.`}
    </p>
  );
}

function TrendTable({ caption, rows, scans, places }: { caption: string; rows: TrendRow[]; scans: Trends["scans"]; places: boolean }) {
  const width = QUESTION_COLUMN_PX + scans.length * SCAN_COLUMN_PX + (places ? PLACE_COLUMN_PX : 0);
  return (
    // Wider than a phone: the table scrolls sideways inside its card, opening on the newest scan, while the question
    // stays in view. Relative, so the hidden screen reader words in the cells stay inside it too.
    <ScrollToNewest className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full border-collapse text-sm" style={{ minWidth: width }}>
        <caption className="sr-only">{caption}: how many AI tools named the business at each weekly scan</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" className="sticky left-0 z-10 bg-card py-2 pr-4 font-medium">
              Question
            </th>
            {scans.map((s) => (
              <th key={s.id} scope="col" className="px-2 py-2 text-right font-medium whitespace-nowrap tabular-nums">
                {dateLabel(s.at)}
              </th>
            ))}
            {places && (
              <th scope="col" className="px-2 py-2 text-right font-medium whitespace-nowrap">
                Place, {dateLabel(scans[scans.length - 1].at)}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <th scope="row" className="sticky left-0 z-10 bg-card py-2.5 pr-4 text-left align-top font-normal">
                <span className="block max-w-[170px] min-w-[140px] break-words sm:max-w-[260px]">{row.prompt}</span>
              </th>
              {row.cells.map((cell, i) => (
                <td key={scans[i].id} className="px-2 py-2.5 text-right align-top whitespace-nowrap tabular-nums">
                  <Cell cell={cell} />
                </td>
              ))}
              {places && (
                <td className="px-2 py-2.5 text-right align-top whitespace-nowrap" data-testid="place">
                  {row.place ? placeText(row.place) : <span className="text-xs text-text-hint">Not asked</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollToNewest>
  );
}

const QUESTION_COLUMN_PX = 170;
const SCAN_COLUMN_PX = 84;
const PLACE_COLUMN_PX = 150;

const CHANGE = {
  up: { Icon: ArrowUp, className: "text-good-text", label: "up on the week before" },
  down: { Icon: ArrowDown, className: "text-low-text", label: "down on the week before" },
  same: { Icon: Minus, className: "text-muted-foreground", label: "same as the week before" },
} as const;

function Cell({ cell }: { cell: TrendCell }) {
  if (!cell) return <span className="text-xs text-text-hint">Not asked</span>;
  const change = cell.change ? CHANGE[cell.change] : null;
  return (
    <span className="inline-flex items-center justify-end gap-1">
      {outOf(cell)}
      {change && (
        <>
          <change.Icon aria-hidden className={cn("size-3.5", change.className)} />
          <span className="sr-only">, {change.label}</span>
        </>
      )}
    </span>
  );
}
