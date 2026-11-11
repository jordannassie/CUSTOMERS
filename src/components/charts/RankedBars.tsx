import { cn } from "cn";

export type ToolMark = { short: string; name: string; used: boolean; color: string; dark?: boolean };

export type RankedRow = {
  key: string;
  label: React.ReactNode;
  sub?: React.ReactNode;
  value: number;
  color: string;
  tools?: ToolMark[];
};

type Props = {
  rows: RankedRow[];
  ariaLabel: string;
  headers?: { label: string; value: string; tools?: string };
  /** The bar's full length; the largest value when left out. */
  max?: number;
  footnote?: React.ReactNode;
};

// Check-in ranked bars (C-Sources): one row per item, a bar on a sunken track, the count, and a filled badge for each
// AI tool that used it. Plain HTML so names wrap and rows can carry links.
export function RankedBars({ rows, ariaLabel, headers, max, footnote }: Props) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  const hasTools = rows.some((r) => r.tools?.length);
  // minmax(0, ...): a long name with no spaces shrinks and wraps instead of widening the grid past the screen.
  // Names get more of the row while this chart is narrow (a phone, or a half-width card), so a usual domain fits on one
  // line; measured on the chart's own width.
  const grid = hasTools
    ? "grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_auto] @min-[560px]:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)_auto]"
    : "grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)] @min-[560px]:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]";
  return (
    <div className="@container flex flex-col" role="figure" aria-label={ariaLabel}>
      {headers && (
        <div className={cn("grid gap-3 pb-1.5 text-xs text-muted-foreground", grid)}>
          <span>{headers.label}</span>
          <span>{headers.value}</span>
          {hasTools && <span className="w-[84px] text-center">{headers.tools}</span>}
        </div>
      )}
      {rows.map((r, k) => (
        <div key={r.key} className={cn("grid items-center gap-3 border-t border-track py-2.5", grid)}>
          <span className="flex min-w-0 flex-col">
            <span className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">{r.label}</span>
            {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
          </span>
          <span className="flex items-center gap-2.5">
            <span className="block h-3.5 flex-1 overflow-hidden rounded-full bg-sunken">
              <span
                className="block h-3.5 origin-left animate-grow-x rounded-full"
                style={{ width: `${Math.max(2, (r.value / top) * 100)}%`, background: r.color, animationDelay: `${0.5 + k * 0.06}s` }}
              />
            </span>
            <span className="w-7 text-right text-sm font-bold tabular-nums">{r.value}</span>
          </span>
          {hasTools && (
            <span className="flex w-[84px] justify-center gap-1.5">
              {(r.tools ?? []).map((t) => (
                <span
                  key={t.short}
                  title={`${t.name}${t.used ? " used it" : " did not use it"}`}
                  className={cn(
                    "flex size-[22px] items-center justify-center rounded-[6px] text-[11px] font-bold",
                    !t.used && "bg-sunken text-muted-foreground",
                    t.used && (t.dark ? "text-foreground" : "text-white"),
                  )}
                  style={t.used ? { background: t.color } : undefined}
                >
                  {t.short}
                  <span className="sr-only">{t.used ? `, ${t.name} used it` : `, ${t.name} did not`}</span>
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
      {footnote && <p className="pt-2 text-xs text-muted-foreground">{footnote}</p>}
    </div>
  );
}
