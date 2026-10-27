"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fixHref } from "@/lib/fix-where";
import type { ActionResult } from "@/modules/auth";
import { STATUS_TEXT, type ActionState } from "@/modules/opportunities/board/service";

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
 * before (from here, Sources or another tab) shows that way from the start, so nothing is added twice.
 */
export function AddToActionsButton({ input, initial, add }: { input: NewActionInput; initial: ActionState | null; add: AddToActionsAction }) {
  const [state, setState] = useState<ActionState | null>(initial);
  const [pending, start] = useTransition();

  if (state) {
    return (
      <Link
        href={fixHref(state.id)}
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md bg-good-bg px-3 text-[13px] font-medium text-good-text outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        data-testid="in-actions"
      >
        <Check className="size-3.5" aria-hidden="true" />
        In Actions · {STATUS_TEXT[state.status]}
      </Link>
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
            toast.success("Added to Actions, in To do.");
          } catch {
            toast.error("That fix could not be added. Check your connection and try again.");
          }
        })
      }
      data-testid="add-to-actions"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
      Add to Actions
    </Button>
  );
}
