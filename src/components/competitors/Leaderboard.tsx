import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { COLLECTING_TEXT, STANDING_TEXT, type CompetitorsView, type LeaderRow } from "@/modules/competitors";

const SHADE = { 1: "bg-competitor-1", 2: "bg-competitor-2", 3: "bg-competitor-3" } as const;
const STANDING_BADGE = { ahead: "good", behind: "mid", about_same: "secondary" } as const;

/**
 * The competitor leaderboard (DESIGN.md signature piece): you in blue, competitors in greys. The shaded
 * band is your score plus or minus the margin, so a bar ending inside it reads as "about the same" (D-64).
 */
export function Leaderboard({ view }: { view: Pick<CompetitorsView, "leaderboard" | "margin"> }) {
  const you = view.leaderboard.find((r) => r.isYou)!;
  const band =
    view.margin !== null && you.score !== null
      ? { left: Math.max(0, you.score - view.margin), right: Math.min(100, you.score + view.margin) }
      : null;

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4" data-testid="leaderboard">
        {view.leaderboard.map((row) => (
          <Row key={`${row.isYou}-${row.name}`} row={row} band={band} />
        ))}
      </ol>
      {band && view.margin! > 0 ? (
        <p className="flex items-start gap-2 text-xs text-text-hint">
          <span aria-hidden className="mt-0.5 h-3 w-4 shrink-0 rounded-xs bg-primary/10 ring-1 ring-inset ring-primary/25" />
          Your score is accurate to about {view.margin} points either way. A competitor inside the shaded area is about
          the same as you.
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

function Row({ row, band }: { row: LeaderRow; band: { left: number; right: number } | null }) {
  const pending = !row.isYou && row.score === null;
  return (
    <li
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)_2.5rem_7.5rem]"
      data-you={row.isYou || undefined}
    >
      <span className={cn("truncate text-sm", row.isYou ? "font-semibold text-primary" : "text-foreground")}>
        {row.isYou ? `${row.name} (you)` : row.name}
      </span>

      {pending ? (
        // Added after the last scan, so there is nothing honest to draw yet.
        <span className="col-span-2 text-xs text-text-hint sm:col-span-3 sm:col-start-2 sm:row-start-1">
          Checked from your next scan
        </span>
      ) : (
        <>
          <span className="col-start-2 row-start-1 text-right text-sm font-semibold tabular-nums sm:col-start-3">
            {row.score}
          </span>

          <div className="relative col-span-2 h-2 sm:col-span-1 sm:col-start-2 sm:row-start-1" aria-hidden>
            <div className="absolute inset-0 rounded-xs bg-muted" />
            {band ? (
              <div
                className="absolute -inset-y-1 bg-primary/10 ring-1 ring-inset ring-primary/25"
                style={{ left: `${band.left}%`, width: `${band.right - band.left}%` }}
              />
            ) : null}
            <div
              className={cn("absolute inset-y-0 left-0 rounded-xs", row.isYou ? "bg-primary" : SHADE[row.shade ?? 3])}
              style={{ width: `${Math.max(row.score ?? 0, 1)}%` }}
            />
          </div>

          {row.standing ? (
            <span className="col-span-2 sm:col-span-1 sm:col-start-4 sm:row-start-1 sm:text-right">
              <Badge variant={STANDING_BADGE[row.standing]} data-testid="standing">
                {STANDING_TEXT[row.standing]}
              </Badge>
            </span>
          ) : row.collecting ? (
            <span className="col-span-2 sm:col-span-1 sm:col-start-4 sm:row-start-1 sm:text-right">
              <Badge variant="outline" data-testid="collecting">
                {COLLECTING_TEXT}
              </Badge>
            </span>
          ) : null}
        </>
      )}
    </li>
  );
}
