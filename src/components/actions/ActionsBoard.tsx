"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { PageHeader } from "@/components/app/PageHeader";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { WHERE_LABEL, fixCardId, type Where } from "@/lib/fix-where";
import type { ActionResult } from "@/modules/auth";
import {
  OPEN_ACTION_STATUSES,
  PLACE_GROUP,
  WHERE_FILTER_TEXT,
  WHERE_FILTERS,
  inWhere,
  type ActionItem,
  type ActionStatus,
  type WhereFilter,
} from "@/modules/opportunities/board/service";
import { WHERE_ORDER } from "@/modules/opportunities/where";
import { ActionCard, IMPACT } from "./ActionCard";
import { ActionsList } from "./ActionsList";
import { BoardColumns } from "./BoardColumns";
import { publishOpenCount } from "./open-count";
import { dropOverride, overrideKey, pruneOverrides, settleOverride, startOverride, withOverrides, type Overrides, type Patch } from "./board-overrides";

export type MoveAction = (input: { businessId: string; actionId: string; status: ActionStatus }) => Promise<ActionResult<{ status: ActionStatus }>>;
export type AssignAction = (input: { businessId: string; actionId: string; toMe: boolean }) => Promise<ActionResult<{ toMe: boolean }>>;

type Impact = ActionItem["impact"];
const DONE_NOTE: Partial<Record<ActionStatus, string>> = {
  todo: "Moved to To do.",
  in_progress: "Moved to In progress.",
  done: "Marked done.",
  dismissed: "Dismissed. You can bring it back from Dismissed.",
};

/**
 * The Actions board (dashboard redesign): Suggested, To do, In progress, Done and Dismissed, or one list, filtered by
 * impact and where the fix is made. Moves show at once and are saved in the background. (The "Assigned" filter is
 * off for now, the user's call 2026-10-27; "Assign to me" on a card still works.) It draws the page header too
 * (mockup-ui), so the filters and the Board or List switch sit beside the title; `children` go between the header
 * and the board.
 */
export function ActionsBoard({
  businessId,
  initialItems,
  move,
  assign,
  pickedId,
  description,
  add = null,
  siteDomain = null,
  children,
  readOnly = false,
}: {
  businessId: string;
  initialItems: ActionItem[];
  move: MoveAction;
  assign: AssignAction;
  pickedId: string | null;
  /** The line under the title. */
  description: ReactNode;
  /** The "Add action" button, last in the header row. */
  add?: ReactNode;
  /** The business's own website, for the icon of fixes made there. */
  siteDomain?: string | null;
  children?: ReactNode;
  /** An ended plan (MVP_SPEC 4.4): fixes can be read and filtered, not moved or assigned. */
  readOnly?: boolean;
}) {
  // The server's list wins on every refresh; the board's own moves sit on top while they are saved (board-overrides.ts).
  const [overrides, setOverrides] = useState<Overrides>({});
  const items = useMemo(() => withOverrides(initialItems, overrides), [initialItems, overrides]);
  const serverItems = useRef(initialItems);
  useEffect(() => {
    serverItems.current = initialItems;
  }, [initialItems]);
  // The header's "N open." follows the board's own list (OpenCount), since a move no longer renders the page again.
  useEffect(() => {
    publishOpenCount(businessId, items.filter((i) => OPEN_ACTION_STATUSES.includes(i.status)).length);
  }, [businessId, items]);
  useEffect(() => () => publishOpenCount(businessId, null), [businessId]);
  const [view, setView] = useState<"board" | "list">("board");
  const [impact, setImpact] = useState<Impact | "all">("all");
  const [place, setPlace] = useState<WhereFilter | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  // A link to one fix (?fix=) brings it into view; one that is gone says so instead of leaving the user guessing.
  const pickedFound = !pickedId || items.some((i) => i.id === pickedId);
  useEffect(() => {
    if (!pickedId) return;
    const card = document.getElementById(fixCardId(pickedId));
    if (card) card.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [pickedId]);
  useEffect(() => {
    if (!pickedFound) toast.info("That fix is no longer in your Actions. It may have been replaced by a newer scan.");
  }, [pickedFound]);

  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          (impact === "all" || i.impact === impact) &&
          (place === "all" || inWhere(i.place, place)),
      ),
    [items, impact, place],
  );
  // Open fixes in each of the three groups; a click shows only that group.
  const counts = WHERE_ORDER.map((where: Where) => ({
    place: where,
    n: items.filter((i) => PLACE_GROUP[i.place] === where && i.status !== "dismissed" && i.status !== "done").length,
  })).filter((c) => c.n > 0);

  /** Shows the change at once, saves it, and drops it again if the save fails. */
  function change(kind: "move" | "assign", item: ActionItem, patch: Patch, save: () => Promise<ActionResult<unknown>>, done?: string) {
    const key = overrideKey(kind, item.id);
    setOverrides((all) => startOverride(pruneOverrides(all, serverItems.current), key, item.id, patch));
    if (kind === "move") setBusy(item.id);
    start(async () => {
      try {
        const result = await save();
        if (!result.ok) throw new Error(result.error);
        setOverrides((all) => settleOverride(all, key, serverItems.current));
        if (done) toast.success(done);
      } catch (error) {
        setOverrides((all) => dropOverride(all, key));
        toast.error(error instanceof Error && error.message ? error.message : "That change could not be saved. Check your connection and try again.");
      } finally {
        if (kind === "move") setBusy(null);
      }
    });
  }

  function onMove(item: ActionItem, status: ActionStatus) {
    const completedAt = status === "done" ? new Date().toISOString() : null;
    change("move", item, { status, completedAt }, () => move({ businessId, actionId: item.id, status }), DONE_NOTE[status]);
  }

  function onAssign(item: ActionItem, toMe: boolean) {
    change("assign", item, { assignedToYou: toMe }, () => assign({ businessId, actionId: item.id, toMe }));
  }

  const card = (i: ActionItem) => (
    <ActionCard key={i.id} item={i} busy={busy === i.id} picked={pickedId === i.id} onMove={(s) => onMove(i, s)} onAssign={(m) => onAssign(i, m)} siteDomain={siteDomain} readOnly={readOnly} />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Actions"
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:justify-end" data-testid="action-filters">
            <Filter label="Impact" value={impact} onChange={setImpact} options={[["all", "All"], ...(["high", "medium", "low"] as const).map((v) => [v, IMPACT[v].text] as const)]} />
            <Filter label="Where" value={place} onChange={setPlace} options={[["all", "All"], ...WHERE_FILTERS.map((p) => [p, WHERE_FILTER_TEXT[p]] as const)]} />
            <SegmentedControl
              aria-label="View"
              value={view}
              onValueChange={(v) => setView(v as "board" | "list")}
              options={[
                { value: "board", label: "Board" },
                { value: "list", label: "List" },
              ]}
            />
            {add}
          </div>
        }
      >
        {counts.length > 0 && (
          <p className="flex flex-wrap gap-1.5" data-testid="place-counts">
            {counts.map((c) => (
              <button
                key={c.place}
                type="button"
                aria-pressed={place === c.place}
                onClick={() => setPlace(place === c.place ? "all" : c.place)}
                className={cn(
                  "h-[22px] rounded-sm border px-2 text-xs font-medium tabular-nums transition-colors",
                  place === c.place ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-muted",
                )}
              >
                {WHERE_LABEL[c.place]} {c.n}
              </button>
            ))}
          </p>
        )}
      </PageHeader>

      {children}

      {view === "list" ? (
        <ActionsList items={shown} busy={busy} pickedId={pickedId} onMove={onMove} onAssign={onAssign} readOnly={readOnly} />
      ) : (
        <BoardColumns items={shown} pickedId={pickedId} card={card} />
      )}
    </div>
  );
}

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
        className="h-8 w-auto max-w-60 min-w-0 gap-1.5 rounded-md px-2.5 text-[13px] md:text-[13px]"
        options={options.map(([v, text]) => ({ value: v, label: `${label}: ${text}` }))}
      />
    </div>
  );
}
