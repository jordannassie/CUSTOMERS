"use client";

import { Loader2, MoreHorizontal, Pause, Pencil, Play, Trash2 } from "lucide-react";
import type { QuestionRow } from "@/modules/questions/service";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type ControlHandlers = {
  question: QuestionRow;
  pending: boolean;
  /** Set when the plan has no room, so a paused question cannot be resumed. */
  limitMessage: string | null;
  onEdit: () => void;
  onActive: (active: boolean) => void;
  onRemove: () => void;
};

/** The row's "..." menu, for keyboard and phone users who do not open the question. */
export function RowMenu({ question, pending, limitMessage, onEdit, onActive, onRemove }: ControlHandlers) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Options for: ${question.text}`} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden="true" />
          Edit
        </DropdownMenuItem>
        {question.active ? (
          <DropdownMenuItem onSelect={() => onActive(false)}>
            <Pause aria-hidden="true" />
            Pause
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled={limitMessage !== null} onSelect={() => onActive(true)}>
            <Play aria-hidden="true" />
            Resume
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onSelect={onRemove}>
          <Trash2 aria-hidden="true" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The same controls as buttons, at the foot of an opened question. */
export function ControlButtons({ question, pending, limitMessage, onEdit, onActive, onRemove }: ControlHandlers) {
  return (
    <>
      {question.active ? (
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => onActive(false)}>
          <Pause aria-hidden="true" />
          Pause
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || limitMessage !== null}
          title={limitMessage ?? undefined}
          onClick={() => onActive(true)}
        >
          <Play aria-hidden="true" />
          Resume
        </Button>
      )}
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onEdit}>
        <Pencil aria-hidden="true" />
        Edit question or topic
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onRemove} className="text-low-text hover:text-low-text">
        <Trash2 aria-hidden="true" />
        Remove
      </Button>
    </>
  );
}

type RemoveProps = {
  question: QuestionRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  /** "About 13 fewer credits a month" */
  fewer: string;
  scoreNote: string;
  onConfirm: () => void;
};

export function RemoveDialog({ question, open, onOpenChange, pending, fewer, scoreNote, onConfirm }: RemoveProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent role="alertdialog">
        <DialogHeader>
          <DialogTitle>Remove this question?</DialogTitle>
          <DialogDescription>
            “{question.text}” and its past results will be deleted.{scoreNote} To stop checking it for now, pause it instead.
          </DialogDescription>
        </DialogHeader>
        {question.active && <p className="text-sm text-muted-foreground">{fewer}.</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep it</Button>
          </DialogClose>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Remove question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
