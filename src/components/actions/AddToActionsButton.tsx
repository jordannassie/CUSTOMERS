"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fixHref } from "@/lib/fix-where";
import type { ActionResult } from "@/modules/auth";
import { STATUS_TEXT, type ActionState } from "@/modules/opportunities/board/service";
import type { MoveAction } from "./ActionsBoard";

/** What "Add to Actions" saves (addActionInput); the page fills it from a reason or a site. */
export type NewActionInput = {
  businessId: string;
  title: string;
  fact: string;
  whatToDo: string;
  whereToApply: string;
  impact: "high" | "medium" | "low";
  category: string;
  source: "comparison" | "sources" | "manual";
  dedupeKey: string;
  evidenceData?: { [key: string]: string | number | boolean | null | string[] };
};

export type AddToActionsAction = (input: NewActionInput) => Promise<ActionResult<ActionState>>;

/**
 * "Add to Actions" (dashboard redesign). Once added it reads "In Actions · To do" and opens that action; a fix added
 * before (from here, Sources, another tab or a scan) shows that way from the start, so nothing is added twice. A scan's
 * fix still in Suggested offers "Move to To do" (`move`), which moves that fix instead of adding a copy.
 */
export function AddToActionsButton({
  input,
  initial,
  add,
  move,
  openAfterAdd = false,
  label = "Add to Actions",
}: {
  input: NewActionInput;
  initial: ActionState | null;
  add: AddToActionsAction;
  move?: MoveAction;
  /** Go straight to the new fix on Actions once it is added (the Questions page), instead of staying here. */
  openAfterAdd?: boolean;
  label?: string;
}) {
  const [state, setState] = useState<ActionState | null>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  function moveToTodo(id: string) {
    if (!move) return;
    start(async () => {
      try {
        const result = await move({ businessId: input.businessId, actionId: id, status: "todo" });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setState({ id, status: result.data.status });
        toast.success("Moved to To do.", { action: { label: "View", onClick: () => router.push(fixHref(id)) } });
      } catch {
        toast.error("That change could not be saved. Check your connection and try again.");
      }
    });
  }

  if (state) {
    const link = (
      <Link
        href={fixHref(state.id)}
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md bg-good-bg px-3 text-[13px] font-medium text-good-text outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        data-testid="in-actions"
      >
        <Check className="size-3.5" aria-hidden="true" />
        In Actions · {STATUS_TEXT[state.status]}
      </Link>
    );
    if (state.status !== "suggested" || !move) return link;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {link}
        <Button type="button" size="sm" variant="outline" className="w-fit" disabled={pending} onClick={() => moveToTodo(state.id)} data-testid="move-to-todo">
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-3.5" aria-hidden="true" />}
          Move to To do
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="w-fit"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const result = await add(input);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setState(result.data);
            if (openAfterAdd) {
              toast.success("Added to Actions, in To do. Opening it now.");
              router.push(fixHref(result.data.id));
              return;
            }
            // A way to the new fix without leaving this page first.
            const id = result.data.id;
            toast.success("Added to Actions, in To do.", { action: { label: "View", onClick: () => router.push(fixHref(id)) } });
          } catch {
            toast.error("That fix could not be added. Check your connection and try again.");
          }
        })
      }
      data-testid="add-to-actions"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
      {label}
    </Button>
  );
}
