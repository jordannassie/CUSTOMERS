import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "cn";
import type { PointsChange as Change } from "@/modules/overview";

/**
 * "Up 6" against last week (DB-013); only ever given a change bigger than the margin (D-64). `neutral` is for a
 * competitor, whose rise is not good news for the business.
 */
export function PointsChange({ change, neutral = false, period = "week" }: { change: Change; neutral?: boolean; period?: "week" | "month" }) {
  const up = change.direction === "up";
  const text = `${up ? "Up" : "Down"} ${change.points}`;
  // The monthly client report compares with the 30 days before; everywhere else with last week.
  const against = period === "month" ? "on the 30 days before" : "on last week";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 text-xs font-medium tabular-nums",
        neutral ? "text-muted-foreground" : up ? "text-good-text" : "text-low-text",
      )}
      title={`${text} ${change.points === 1 ? "point" : "points"} ${against}`}
      data-testid="points-change"
    >
      {up ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />}
      {text}
      <span className="sr-only">
        {" "}
        {change.points === 1 ? "point" : "points"} {against}
      </span>
    </span>
  );
}
