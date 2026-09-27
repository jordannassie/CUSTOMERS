import { cn } from "cn";
import { count } from "./format";

export type BreakdownRow = { key: string; label: string; credits: number; dot?: string };

// A ranked list with bars scaled to the month's total, so the rows add up to "used this month".
export function Breakdown({ title, rows, total, testId }: { title: string; rows: BreakdownRow[]; total: number; testId: string }) {
  return (
    <section aria-label={title} data-testid={testId} className="rounded-md border border-border bg-surface p-5">
      <h3 className="text-[15px] font-semibold tracking-[-0.02em]">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing yet this month.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {rows.map((row) => {
            const share = total > 0 ? Math.round((row.credits / total) * 100) : 0;
            return (
              <li key={row.key} data-row={row.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {row.dot && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", row.dot)} />}
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span data-credits className="font-medium">
                      {count(row.credits)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">{share}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-[2px] bg-muted" aria-hidden>
                  <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
