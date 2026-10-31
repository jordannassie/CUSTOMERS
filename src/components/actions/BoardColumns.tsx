"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Circle, CircleCheck, CircleDashed, CircleSlash, Contrast, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { STATUS_TEXT, type ActionItem, type ActionStatus } from "@/modules/opportunities/board/service";

/** The four working columns, side by side; Dismissed sits folded away under them. */
const BOARD: ActionStatus[] = ["suggested", "todo", "in_progress", "done"];

const STATUS_ICON: Record<ActionStatus, { icon: LucideIcon; className: string }> = {
  suggested: { icon: CircleDashed, className: "text-primary" },
  todo: { icon: Circle, className: "text-muted-foreground" },
  in_progress: { icon: Contrast, className: "text-mid" },
  done: { icon: CircleCheck, className: "fill-good text-surface" },
  dismissed: { icon: CircleSlash, className: "text-text-hint" },
};

const EMPTY: Record<ActionStatus, string> = {
  suggested: "New fixes from your scans show here.",
  todo: "Accept a suggestion to plan it.",
  in_progress: "Move a fix here while you work on it.",
  done: "Finished fixes show here.",
  dismissed: "No dismissed actions",
};

function ColumnHead({ status, count }: { status: ActionStatus; count: number }) {
  const { icon: Icon, className } = STATUS_ICON[status];
  return (
    <>
      <Icon className={cn("size-[15px] shrink-0", className)} aria-hidden="true" />
      {STATUS_TEXT[status]}
      <span className="rounded-xs border border-border bg-surface px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">{count}</span>
    </>
  );
}

function Empty({ status }: { status: ActionStatus }) {
  return <p className="rounded-lg border border-dashed border-border bg-surface px-3 py-5 text-center text-xs text-text-hint">{EMPTY[status]}</p>;
}

/**
 * The board view (mockup-ui redesign): Suggested, To do, In progress and Done as muted panels of cards, scrolling
 * sideways inside their own box when the screen is narrow, then Dismissed folded under them. Dismissed opens by
 * itself when the fix a link picked (?fix=) is in it.
 */
export function BoardColumns({ items, pickedId, card }: { items: ActionItem[]; pickedId: string | null; card: (item: ActionItem) => ReactNode }) {
  const dismissed = items.filter((i) => i.status === "dismissed");
  const [showDismissed, setShowDismissed] = useState(() => dismissed.some((i) => i.id === pickedId));
  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" data-testid="action-board">
        <div className="grid grid-cols-[repeat(4,minmax(245px,1fr))] gap-3">
          {BOARD.map((status) => {
            const column = items.filter((i) => i.status === status);
            return (
              <section
                key={status}
                className="flex min-h-[360px] flex-col gap-2.5 rounded-lg border border-border bg-muted p-2.5"
                aria-label={STATUS_TEXT[status]}
                data-testid={`column-${status}`}
              >
                <h2 className="flex items-center gap-2 px-1 pt-1 pb-0.5 text-[13px] font-semibold">
                  <ColumnHead status={status} count={column.length} />
                </h2>
                {column.length === 0 ? <Empty status={status} /> : column.map(card)}
              </section>
            );
          })}
        </div>
      </div>
      <section className="rounded-lg border border-border bg-muted p-2.5" aria-label={STATUS_TEXT.dismissed} data-testid="column-dismissed">
        <h2 className="text-[13px] font-semibold">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-expanded={showDismissed}
            onClick={() => setShowDismissed((s) => !s)}
          >
            <ColumnHead status="dismissed" count={dismissed.length} />
            <ChevronRight className={cn("ml-auto size-4 text-muted-foreground transition-transform", showDismissed && "rotate-90")} aria-hidden="true" />
          </button>
        </h2>
        {/* The cards stay on the page while folded, so a move to Dismissed is counted and found like any column's. */}
        <div className={cn("mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(245px,1fr))] gap-3", !showDismissed && "hidden")}>
          {dismissed.length === 0 ? <Empty status="dismissed" /> : dismissed.map(card)}
        </div>
      </section>
    </div>
  );
}
