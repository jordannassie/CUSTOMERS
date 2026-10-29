"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fixHref } from "@/lib/fix-where";
import type { ActionResult } from "@/modules/auth";
import { STATUS_TEXT, type ActionState, type ActionStatus } from "@/modules/opportunities/board/service";
import type { SiteAction } from "@/modules/sources/listings";

/** The addToActions server action, passed in by the page. */
export type AddToActions = (input: unknown) => Promise<ActionResult<ActionState>>;

type Props = {
  businessId: string;
  action: SiteAction;
  inActions: ActionStatus | null;
  /** The saved fix's id, so the link opens it on the board. */
  actionId?: string | null;
  add: AddToActions;
  /** "Get listed" in the table, "Add to Actions" in the cards. */
  label?: string;
};

// Adds a site's fix to Actions in To do. Once added it says which column it is in, and links to the board.
export function AddToActionsButton({ businessId, action, inActions, actionId = null, add, label = "Add to Actions" }: Props) {
  const [added, setAdded] = useState<ActionStatus | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const id = addedId ?? actionId;
  const [pending, start] = useTransition();
  const router = useRouter();
  // The same site can have a button in "Get listed here first" and in the table; the refresh updates both.
  const status = added ?? inActions;

  if (status) {
    return (
      <Link
        href={id ? fixHref(id) : "/actions"}
        className="inline-flex h-8 items-center gap-1.5 text-[13px] font-medium whitespace-nowrap text-good-text hover:underline"
        data-testid="in-actions"
      >
        <CircleCheck className="size-3.5" aria-hidden="true" />
        In Actions · {STATUS_TEXT[status]}
      </Link>
    );
  }

  function onAdd() {
    start(async () => {
      const result = await add({ businessId, ...action });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAdded(result.data.status);
      setAddedId(result.data.id);
      const newId = result.data.id;
      toast.success(`Added to Actions: ${action.title}.`, { action: { label: "View", onClick: () => router.push(fixHref(newId)) } });
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onAdd}
      disabled={pending}
      data-testid="add-to-actions"
      aria-label={`${label}: ${action.title}`}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
      {label}
    </Button>
  );
}
