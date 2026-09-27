import { Check, Minus } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminBusinessDetail } from "@/modules/admin";
import { formatDate, modelLabel } from "../../_components/scan-parts";
import Section, { Empty } from "./section";

type Results = NonNullable<AdminBusinessDetail>["results"];

// Columns follow the fixed model order, keeping only models the scan asked or the business uses now.
const ORDER = ["openai", "anthropic", "perplexity"];

export default function AnswersGrid({ results, models }: { results: Results; models: string[] }) {
  if (!results || results.rows.length === 0) {
    return (
      <Section title="Latest answers">
        <Empty>No finished scan with answers yet.</Empty>
      </Section>
    );
  }

  const asked = new Set(results.rows.flatMap((r) => Object.keys(r.mentioned)));
  const columns = ORDER.filter((m) => asked.has(m) || models.includes(m));

  return (
    <Section title="Latest answers" note={results.at ? `Scan of ${formatDate(results.at, true)}` : undefined}>
      <div className="rounded-md border border-border bg-surface">
        <Table className="text-[13px]">
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
                <TableCell className="min-w-[200px] whitespace-normal">{r.question}</TableCell>
                {columns.map((m) => (
                  <TableCell key={m} className="text-center">
                    <Mark value={r.mentioned[m]} />
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
                    {answered.length ? `${named} of ${answered.length}` : "None"}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </Section>
  );
}

function Mark({ value }: { value: boolean | undefined }) {
  if (value === undefined) return <span className="text-text-hint">Not asked</span>;
  return value ? (
    <span className="inline-flex items-center gap-1 text-good-text">
      <Check aria-hidden className="size-4" />
      Named
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Minus aria-hidden className="size-4" />
      Not named
    </span>
  );
}
