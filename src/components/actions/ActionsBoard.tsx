"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { fixCardId } from "@/lib/fix-where";
import type { ActionResult } from "@/modules/auth";
import { ACTION_STATUSES, PLACE_TEXT, PLACES, STATUS_TEXT, type ActionItem, type ActionStatus, type Place } from "@/modules/opportunities/board/service";
import { ActionCard, IMPACT } from "./ActionCard";
import { ActionsList } from "./ActionsList";

export type MoveAction = (input: { businessId: string; actionId: string; status: ActionStatus }) => Promise<ActionResult<{ status: ActionStatus }>>;
export type AssignAction = (input: { businessId: string; actionId: string; toMe: boolean }) => Promise<ActionResult<{ toMe: boolean }>>;

type Impact = ActionItem["impact"];
const DONE_NOTE: Partial<Record<ActionStatus, string>> = {
  todo: "Moved to To do.",
  in_progress: "Moved to In progress.",
  done: "Marked done. We will measure the effect over the next 30 days.",
  dismissed: "Dismissed. You can bring it back from Dismissed.",
};

/**
 * The Actions board (dashboard redesign): Suggested, To do, In progress, Done and Dismissed, or one list, filtered by
 * impact and where the fix is made. Moves show at once and are saved in the background. (The "Assigned" filter is
 * off for now, the user's call 2026-10-27; "Assign to me" on a card still works.)
 */
export function ActionsBoard({
  businessId,
  initialItems,
  move,
  assign,
  pickedId,
}: {
  businessId: string;
  initialItems: ActionItem[];
  move: MoveAction;
  assign: AssignAction;
  pickedId: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [view, setView] = useState<"board" | "list">("board");
  const [impact, setImpact] = useState<Impact | "all">("all");
  const [place, setPlace] = useState<Place | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if (!pickedId) return;
    document.getElementById(fixCardId(pickedId))?.scrollIntoView({ block: "center" });
  }, [pickedId]);

  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          (impact === "all" || i.impact === impact) &&
          (place === "all" || i.place === place),
      ),
    [items, impact, place],
  );
  const counts = PLACES.map((p) => ({ place: p, n: items.filter((i) => i.place === p && i.status !== "dismissed" && i.status !== "done").length })).filter((c) => c.n > 0);

  function onMove(item: ActionItem, status: ActionStatus) {
    const before = items;
    const now = new Date().toISOString();
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, status, completedAt: status === "done" ? now : null } : i)));
    setBusy(item.id);
    start(async () => {
      try {
        const result = await move({ businessId, actionId: item.id, status });
        if (!result.ok) throw new Error(result.error);
        if (DONE_NOTE[status]) toast.success(DONE_NOTE[status]);
      } catch (error) {
        setItems(before);
        toast.error(error instanceof Error && error.message ? error.message : "That change could not be saved. Check your connection and try again.");
      } finally {
        setBusy(null);
      }
    });
  }

  function onAssign(item: ActionItem, toMe: boolean) {
    setItems((all) => all.map((i) => (i.id === item.id ? { ...i, assignedToYou: toMe } : i)));
    start(async () => {
      const result = await assign({ businessId, actionId: item.id, toMe }).catch(() => null);
      if (!result?.ok) {
        setItems((all) => all.map((i) => (i.id === item.id ? { ...i, assignedToYou: !toMe } : i)));
        toast.error(result && !result.ok ? result.error : "That change could not be saved. Try again.");
      }
    });
  }

  const card = (i: ActionItem) => (
    <ActionCard key={i.id} item={i} busy={busy === i.id} picked={pickedId === i.id} onMove={(s) => onMove(i, s)} onAssign={(m) => onAssign(i, m)} />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" data-testid="action-filters">
        <Filter label="Impact" value={impact} onChange={setImpact} options={[["all", "All"], ...(["high", "medium", "low"] as const).map((v) => [v, IMPACT[v].text] as const)]} />
        <Filter label="Where" value={place} onChange={setPlace} options={[["all", "All"], ...PLACES.map((p) => [p, PLACE_TEXT[p]] as const)]} />
        <SegmentedControl
          className="sm:ml-auto"
          aria-label="View"
          value={view}
          onValueChange={(v) => setView(v as "board" | "list")}
          options={[
            { value: "board", label: "Board" },
            { value: "list", label: "List" },
          ]}
        />
      </div>
      {counts.length > 0 && (
        <p className="flex flex-wrap gap-1.5" data-testid="place-counts">
          {counts.map((c) => (
            <button
              key={c.place}
              type="button"
              onClick={() => setPlace(place === c.place ? "all" : c.place)}
              className={cn("rounded-xs px-2 py-0.5 text-xs font-medium", place === c.place ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70")}
            >
              {PLACE_TEXT[c.place]} {c.n}
            </button>
          ))}
        </p>
      )}

      {view === "list" ? (
        <ActionsList items={shown} busy={busy} pickedId={pickedId} onMove={onMove} onAssign={onAssign} />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" data-testid="action-board">
          <div className="grid grid-cols-[repeat(5,minmax(200px,1fr))] gap-3">
            {ACTION_STATUSES.map((status) => {
              const column = shown.filter((i) => i.status === status);
              return (
                <section key={status} className="flex flex-col gap-2.5 rounded-md bg-muted/50 p-2.5" aria-label={STATUS_TEXT[status]} data-testid={`column-${status}`}>
                  <h2 className="flex items-center gap-2 px-1 pt-1 text-sm font-semibold">
                    {STATUS_TEXT[status]}
                    <span className="rounded-xs border border-border bg-surface px-1.5 text-xs font-medium tabular-nums">{column.length}</span>
                  </h2>
                  {column.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border p-5 text-center text-xs text-muted-foreground">{EMPTY[status]}</p>
                  ) : (
                    column.map(card)
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY: Record<ActionStatus, string> = {
  suggested: "New fixes from your scans show here.",
  todo: "Accept a suggestion to plan it.",
  in_progress: "Move a fix here while you work on it.",
  done: "Finished fixes show here.",
  dismissed: "No dismissed actions",
};

function Filter<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[] }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select
        id={id}
        placeholder={label}
        value={value}
        onValueChange={(v) => onChange(v as T)}
        className="h-9 w-auto min-w-36 rounded-md text-[13px]"
        options={options.map(([v, text]) => ({ value: v, label: `${label}: ${text}` }))}
      />
    </div>
  );
}
