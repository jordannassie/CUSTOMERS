"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const OVERDRAFT_TITLE = "This scan needs more credits than you have";

/**
 * Asked before a Run scan that costs more than the balance (D-54). The scan still runs and finishes if the
 * user confirms; the extra credits come out of the next grant. `message` is the server's own wording.
 */
export function OverdraftDialog({
  message,
  onConfirm,
  onCancel,
}: {
  /** Null keeps the dialog closed. */
  message: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={message !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md" role="alertdialog" data-testid="overdraft-dialog">
        <DialogHeader>
          <DialogTitle>{OVERDRAFT_TITLE}</DialogTitle>
          <DialogDescription data-testid="overdraft-message">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button asChild variant="outline">
            <Link href="/settings/credits">Buy credits</Link>
          </Button>
          <Button type="button" onClick={onConfirm}>
            Run scan anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
