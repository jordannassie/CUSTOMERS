"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Asks once before an admin action that spends something. Nothing happens until the confirm button. With `askReason`,
 * it also asks why (at least 3 characters), and hands the reason to `onConfirm` for the admin history.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  onConfirm,
  askReason = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  askReason?: boolean;
}) {
  const [reason, setReason] = useState("");
  const reasonId = useId();
  const ready = !askReason || reason.trim().length >= 3;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" role="alertdialog" data-testid="confirm-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        {askReason && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={reasonId}>Reason</Label>
            <Input
              id={reasonId}
              value={reason}
              maxLength={500}
              placeholder="For example: support ticket 42, customer asked for a fresh scan"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!ready}
            onClick={() => {
              onOpenChange(false);
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "This uses about 36 credits from Acme Agency. Run it?": active questions times models, what a full scan charges. */
export function scanCostMessage(credits: number, agencyName: string | null): string {
  const amount = `about ${credits.toLocaleString("en-US")} ${credits === 1 ? "credit" : "credits"}`;
  return `This uses ${amount} from ${agencyName || "the agency"}. Run it?`;
}
