import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "cn";
import type { PointsChange as Change } from "@/modules/overview";

/**
 * "Up 6" against last week (DB-013); only ever given a change bigger than the margin (D-64). `neutral` is for a
 * competitor, whose rise is not good news for the business.
 */
export function PointsChange({ change, neutral = false }: { change: Change; neutral?: boolean }) {
  const up = change.direction === "up";
  const text = `${up ? "Up" : "Down"} ${change.points}`;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 text-xs font-medium tabular-nums",
        neutral ? "text-muted-foreground" : up ? "text-good-text" : "text-low-text",
      )}
      title={`${text} ${change.points === 1 ? "point" : "points"} on last week`}
      data-testid="points-change"
    >
      {up ? <ArrowUp className="size-3" aria-hidden="true" /> : <ArrowDown className="size-3" aria-hidden="true" />}
      {text}
      <span className="sr-only"> {change.points === 1 ? "point" : "points"} on last week</span>
    </span>
  );
}
