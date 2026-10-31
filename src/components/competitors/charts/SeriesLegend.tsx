import { cn } from "cn";
import type { ChartSeries } from "@/modules/competitors";

// You solid; competitors solid, dashed, dotted: the greys are close, so the line style tells them apart too.
const DASHES = [undefined, undefined, "6 4", "2 3"];

/** The line style of the series at this position (you first). */
export const lineDash = (index: number) => DASHES[index];

/** The names behind the colors, so no series is told apart by color alone. `dashes`: show each line's style. */
export function SeriesLegend({
  series,
  className,
  dashes = false,
}: {
  series: Pick<ChartSeries, "key" | "name" | "isYou" | "color">[];
  className?: string;
  dashes?: boolean;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)} data-testid="chart-legend">
      {series.map((s, i) => (
        <li key={s.key} className="flex min-w-0 items-center gap-1.5">
          {dashes ? (
            <svg width="18" height="6" className="shrink-0" aria-hidden="true">
              <line x1="1" y1="3" x2="17" y2="3" stroke={s.color} strokeWidth={s.isYou ? 2.5 : 2} strokeDasharray={lineDash(i)} strokeLinecap="round" />
            </svg>
          ) : (
            <span className={cn("shrink-0 rounded-full", s.isYou ? "size-2.5" : "size-2")} style={{ background: s.color }} aria-hidden="true" />
          )}
          <span className={cn("truncate", s.isYou && "font-medium text-foreground")}>
            {s.name}
            {s.isYou ? " (you)" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One hover card for every chart: the row's title, then each series' value, highest first. */
export function SeriesTooltip({
  title,
  rows,
  unit = "",
  footer,
}: {
  title: string;
  rows: { key: string; name: string; isYou: boolean; color: string; value: number | null }[];
  unit?: string;
  /** One quiet line under the rows, like "Your 30-day score: 15". */
  footer?: string;
}) {
  const sorted = [...rows].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  return (
    <div className="min-w-44 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-foreground">{title}</p>
      <ul className="flex flex-col gap-1">
        {sorted.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden="true" />
              <span className={cn("truncate", r.isYou && "font-medium text-foreground")}>{r.isYou ? `${r.name} (you)` : r.name}</span>
            </span>
            <span className="tabular-nums text-foreground">{r.value === null ? "No checks" : `${r.value}${unit}`}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{footer}</p>}
    </div>
  );
}
