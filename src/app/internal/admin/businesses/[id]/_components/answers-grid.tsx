import { MoveHorizontal } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminBusinessDetail } from "@/modules/admin";
import { modelLabel } from "../../_components/scan-parts";
import { formatDate, plural } from "../../../_components/format";
import ScanError from "../../../_components/scan-error";
import AnswerCell from "./answer-cell";
import Section, { Empty } from "./section";

type Results = NonNullable<AdminBusinessDetail>["results"];

// Columns follow the fixed model order, keeping only models the scan asked or the business uses now.
const ORDER = ["openai", "anthropic", "perplexity"];

export default function AnswersGrid({ results, models }: { results: Results; models: string[] }) {
  if (!results) {
    return (
      <Section title="Latest answers">
        <Empty>No finished scan yet. Answers show here once a scan is done.</Empty>
      </Section>
    );
  }
  const started = `Scan started ${formatDate(results.at, true)}`;
  if (results.rows.length === 0) {
    return (
      <Section title="Latest answers" note={started}>
        <Empty>
          {results.older
            ? "The newest finished scan is from before answers were saved, so there are none to show."
            : "The newest finished scan saved no answers."}
        </Empty>
      </Section>
    );
  }

  const asked = new Set<string>(results.asked);
  const columns = ORDER.filter((m) => asked.has(m) || models.includes(m));
  const failures = columns.filter((m) => results.failures[m]);

  return (
    <Section title="Latest answers" note={`${started}. Select Named or Not named to read the answer.`}>
      {columns.length > 1 && (
        <p className="flex items-center gap-1.5 text-[length:calc(13px*var(--px,1))] text-muted-foreground md:hidden">
          <MoveHorizontal aria-hidden className="size-4 shrink-0" />
          Scroll sideways to see every model.
        </p>
      )}
      <div className="rounded-md border border-border bg-surface">
        <Table className="text-[length:calc(13px*var(--px,1))]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Question</TableHead>
              {columns.map((m) => (
                <TableHead key={m} className="text-center">
                  {modelLabel(m)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.rows.map((r) => (
              <TableRow key={r.question}>
                <TableCell className="min-w-[calc(200px*var(--px,1))] whitespace-normal wrap-anywhere">{r.question}</TableCell>
                {columns.map((m) => (
                  <TableCell key={m} className="text-center">
                    <AnswerCell value={r.mentioned[m]} asked={asked.has(m)} question={r.question} model={modelLabel(m)} answer={r.answers[m]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Named in</TableCell>
              {columns.map((m) => {
                const answered = results.rows.filter((r) => r.mentioned[m] !== undefined);
                const named = answered.filter((r) => r.mentioned[m]).length;
                return (
                  <TableCell key={m} className="text-center tabular-nums">
                    {answered.length ? `${named} of ${answered.length}` : asked.has(m) ? "No answers" : "Not asked"}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      {failures.length > 0 && (
        <ul aria-label="Checks that failed" className="flex flex-col gap-2 text-[length:calc(13px*var(--px,1))]">
          {failures.map((m) => {
            const { failed, reason } = results.failures[m]!;
            return (
              <li key={m} className="rounded-md border border-border bg-surface px-3 py-2">
                <p className="font-medium">
                  {modelLabel(m)}: {plural(failed, "check", "checks")} failed
                </p>
                <ScanError error={reason ? failureText(m, reason) : null} className="mt-1 text-muted-foreground" />
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

// The worker saves each model's first failure reason without the model in front ("returned 402: ..."); the plain-words
// helper reads "perplexity: perplexity returned 402", or "perplexity is not set up" for a missing key.
function failureText(model: string, reason: string): string {
  return reason.startsWith("not set up") ? `${model} is ${reason}` : `${model}: ${model} ${reason.startsWith(model) ? reason.slice(model.length).trim() : reason}`;
}
