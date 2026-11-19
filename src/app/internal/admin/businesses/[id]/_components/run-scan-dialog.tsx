"use client";

import { useId, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { scanCostMessage } from "../../../_components/confirm-dialog";

/**
 * Asks before an admin scan, like the shared confirm dialog, with what to know first (too few credits, why the last
 * scan failed) above the reason box. Nothing happens until Run scan; the reason goes to the admin history.
 */
export default function RunScanDialog({
  open,
  onOpenChange,
  credits,
  agencyName,
  warnings,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credits: number;
  agencyName: string | null;
  warnings: string[];
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const reasonId = useId();
  const ready = reason.trim().length >= 3;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" role="alertdialog" data-testid="confirm-dialog">
        <DialogHeader>
          <DialogTitle>Run a scan now?</DialogTitle>
          <DialogDescription>{scanCostMessage(credits, agencyName)}</DialogDescription>
        </DialogHeader>
        {warnings.length > 0 && (
          <ul aria-label="Before you run it" className="flex flex-col gap-2" data-testid="scan-warnings">
            {warnings.map((w) => (
              <li key={w} className="flex gap-2 rounded-md bg-mid-bg px-3 py-2 text-[length:calc(13px*var(--px,1))] text-mid-text">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 wrap-anywhere">{w}</span>
              </li>
            ))}
          </ul>
        )}
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
            Run scan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
