"use client";

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

/**
 * Asked before a Run scan within 24 hours of the last scan (2026-10-15, D-54): the answers mostly repeat and each
 * check still uses a credit. `message` is the server's own wording, with the real credit count.
 */
export function RecentScanDialog({
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
      <DialogContent className="sm:max-w-md" role="alertdialog" data-testid="recent-scan-dialog">
        <DialogHeader>
          <DialogTitle>Scan again?</DialogTitle>
          <DialogDescription data-testid="recent-scan-message">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Not now
            </Button>
          </DialogClose>
          <Button type="button" onClick={onConfirm}>
            Scan again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
