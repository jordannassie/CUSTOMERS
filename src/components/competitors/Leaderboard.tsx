import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { PointsChange } from "@/components/overview/PointsChange";
import { COLLECTING_TEXT, STANDING_TEXT, rowName, trackedNote, type CompetitorsView, type LeaderRow } from "@/modules/competitors";

const SHADE = { 1: "bg-competitor-1", 2: "bg-competitor-2", 3: "bg-competitor-3" } as const;
const STANDING_BADGE = { ahead: "good", behind: "mid", about_same: "secondary" } as const;

/** Wraps a row's button in its "See why" panel (Competitors page only). */
export type WhyWrap = (trigger: ReactNode) => ReactNode;

/**
 * The competitor leaderboard (DESIGN.md signature piece): you in blue, competitors in greys. The shaded
 * band is your score plus or minus the margin, so a bar ending inside it reads as "about the same" (D-64).
 * With `why`, a competitor's whole row opens its panel.
 */
export function Leaderboard({ view, why }: { view: Pick<CompetitorsView, "leaderboard" | "margin">; why?: Map<string, WhyWrap> }) {
  const you = view.leaderboard.find((r) => r.isYou)!;
  const band =
    view.margin !== null && you.score !== null
      ? { left: Math.max(0, you.score - view.margin), right: Math.min(100, you.score + view.margin) }
      : null;
  const clickable = !!why && why.size > 0;

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-0.5" data-testid="leaderboard">
        {view.leaderboard.map((row) => (
          <Row key={`${row.isYou}-${row.name}`} row={row} band={band} wrap={row.isYou ? undefined : why?.get(row.name)} column={clickable} />
        ))}
      </ol>
      {band && view.margin! > 0 ? (
        <p className="flex items-start gap-2 text-xs text-text-hint">
          <span aria-hidden className="mt-0.5 h-3 w-4 shrink-0 rounded-xs bg-primary/10 ring-1 ring-inset ring-primary/25" />
          Shaded band: your score, give or take {view.margin} points. A bar ending inside it is about the same as you.
        </p>
      ) : null}
      {view.leaderboard.some((r) => r.collecting) ? (
        <p className="text-xs text-text-hint" data-testid="collecting-note">
          We only look for a competitor from the day you add it, so a new one scores low at first. We compare you once
          it has 30 days of checks.
        </p>
      ) : null}
    </div>
  );
}

function Row({ row, band, wrap, column }: { row: LeaderRow; band: { left: number; right: number } | null; wrap?: WhyWrap; column: boolean }) {
  const pending = !row.isYou && row.score === null;
  // A branch whose answers named only its chain shows the chain, with the tracked branch below it.
  const note = trackedNote(row);
  const grid = cn(
    "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 text-left",
    column ? "sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)_2.5rem_9.5rem_1rem]" : "sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)_2.5rem_9.5rem]",
  );
  const cells = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <span
            className={cn("truncate text-sm", row.isYou ? "font-semibold text-primary" : "text-foreground", wrap && "font-medium")}
            title={row.isYou ? `${row.name} (you)` : rowName(row)}
          >
            {row.isYou ? `${row.name} (you)` : rowName(row)}
          </span>
          {row.change && <PointsChange change={row.change} neutral={!row.isYou} />}
        </span>
        {note && (
          <span className="text-xs text-text-hint" data-testid="chain-note">
            {note}
          </span>
        )}
      </span>

      {pending ? (
        // Added after the last scan, so there is nothing honest to draw yet.
        <span className="col-span-2 text-xs text-text-hint sm:col-span-3 sm:col-start-2 sm:row-start-1">Checked from your next scan</span>
      ) : (
        <>
          <span className="col-start-2 row-start-1 text-right text-sm font-semibold tabular-nums sm:col-start-3">{row.score}</span>

          <span className="relative col-span-2 block h-2 sm:col-span-1 sm:col-start-2 sm:row-start-1" aria-hidden>
            <span className="absolute inset-0 rounded-xs bg-muted" />
            {band ? (
              <span
                className="absolute -inset-y-1 bg-primary/10 ring-1 ring-inset ring-primary/25"
                style={{ left: `${band.left}%`, width: `${band.right - band.left}%` }}
              />
            ) : null}
            <span
              className={cn("absolute inset-y-0 left-0 rounded-xs", row.isYou ? "bg-primary" : SHADE[row.shade ?? 3])}
              style={{ width: `${Math.max(row.score ?? 0, 1)}%` }}
            />
          </span>

          {row.standing ? (
            <span className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:col-start-4 sm:row-start-1 sm:justify-end">
              <Badge variant={STANDING_BADGE[row.standing]} data-testid="standing">
                {STANDING_TEXT[row.standing]}
              </Badge>
              {wrap && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-primary sm:hidden" aria-hidden="true">
                  See why
                  <ChevronRight className="size-3.5" />
                </span>
              )}
            </span>
          ) : row.collecting ? (
            <span className="col-span-2 sm:col-span-1 sm:col-start-4 sm:row-start-1 sm:text-right">
              <Badge variant="outline" data-testid="collecting">
                {COLLECTING_TEXT}
              </Badge>
            </span>
          ) : null}
          {column && (
            <span className="hidden sm:col-start-5 sm:row-start-1 sm:flex sm:justify-end" aria-hidden="true">
              {wrap && <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary" />}
            </span>
          )}
        </>
      )}
    </>
  );

  return (
    <li data-you={row.isYou || undefined}>
      {wrap ? (
        wrap(
          <button
            type="button"
            className={cn(grid, "group/row cursor-pointer transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}
            data-testid="see-why"
          >
            {cells}
            <span className="sr-only">See why</span>
          </button>,
        )
      ) : (
        <div className={grid}>{cells}</div>
      )}
    </li>
  );
}
