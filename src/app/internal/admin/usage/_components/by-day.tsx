import { cn } from "cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UsageCostReport } from "@/modules/admin";
import { count, money, plural, shortDay } from "./format";

/** A round top for the scale (1, 2 or 5 times a power of ten), so the axis reads 0, 500, 1,000 and not 0, 487, 974. */
function niceTop(n: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(n, 1)));
  return [1, 2, 5, 10].map((m) => m * p).find((v) => v >= n) ?? 10 * p;
}

/**
 * Credits used per day as columns, on a scale with round numbers at 0, the middle and the top (2026-11-10: the bars had
 * no scale). Real cost per day is in each column's label and in the table below.
 */
export default function ByDay({ days }: { days: UsageCostReport["byDay"] }) {
  const max = niceTop(Math.max(1, ...days.map((d) => d.credits)));
  const labelEvery = Math.ceil(days.length / 8);

  return (
    <section
      aria-labelledby="by-day"
      className="rounded-md border border-border bg-surface p-4"
    >
      <h2 id="by-day" className="text-[length:calc(16px*var(--px,1))] font-semibold">
        By day
      </h2>
      <p className="mt-1 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
        Credits used each day (UTC).
      </p>

      <div aria-hidden className="mt-4 flex gap-2">
        {/* The scale: the top, the middle and 0, each with a faint line across the chart. */}
        <div className="flex h-40 w-10 shrink-0 flex-col justify-between text-right text-[length:calc(11px*var(--px,1))] text-text-hint tabular-nums">
          <span className="-translate-y-1/2">{count(max)}</span>
          <span>{count(max / 2)}</span>
          <span className="translate-y-1/2">0</span>
        </div>
        <div className="relative flex h-40 min-w-0 flex-1 items-end gap-px sm:gap-0.5">
          <span className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
          <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border" />
          {days.map((d) => (
            <div
              key={d.day}
              title={`${shortDay(d.day)}: ${plural(d.credits, "credit", "credits")}, ${money(d.costUsd)} real cost`}
              className="relative flex h-full flex-1 items-end"
            >
              <div
                className={cn(
                  "w-full rounded-t-xs",
                  d.credits > 0 ? "bg-primary" : "bg-muted",
                )}
                style={{
                  height:
                    d.credits > 0
                      ? `${Math.max((d.credits / max) * 100, 2)}%`
                      : "2px",
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden
        className="mt-2 ml-12 flex gap-px overflow-hidden text-[length:calc(12px*var(--px,1))] text-text-hint sm:gap-0.5"
      >
        {days.map((d, i) => (
          // Phones show every other label so they do not run into each other; the hidden ones are clipped, since they
          // still take room and the last one would widen the page.
          <span
            key={d.day}
            className={cn(
              "tabular flex-1 overflow-visible whitespace-nowrap",
              i % (labelEvery * 2) !== 0 &&
                "invisible overflow-hidden sm:visible sm:overflow-visible",
            )}
          >
            {i % labelEvery === 0 ? shortDay(d.day) : ""}
          </span>
        ))}
      </div>

      <details className="mt-4 text-[length:calc(13px*var(--px,1))]">
        <summary className="cursor-pointer font-medium text-primary hover:underline">
          Show as a table
        </summary>
        {/* The same table as every other admin list, newest day first, every column left-aligned. */}
        <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-border">
          <Table className="text-[length:calc(13px*var(--px,1))]">
            <TableHeader className="sticky top-0">
              <TableRow>
                {["Day", "Credits used", "Real AI cost"].map((h) => (
                  <TableHead key={h} className="px-4 text-[length:calc(12px*var(--px,1))] font-medium text-muted-foreground">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...days].reverse().map((d) => (
                <TableRow key={d.day}>
                  <TableCell className="px-4 tabular-nums">{shortDay(d.day)}</TableCell>
                  <TableCell className={cn("px-4 tabular-nums", d.credits === 0 && "text-text-hint")}>{count(d.credits)}</TableCell>
                  <TableCell className={cn("px-4 tabular-nums", d.costUsd === 0 && "text-text-hint")}>{money(d.costUsd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </section>
  );
}
