"use client";

import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ActionResult } from "@/modules/auth";
import { plural } from "../../_components/format";

type Retry = (input: { jobId: string }) => Promise<ActionResult<{ jobId: string }>>;

type Props = {
  jobId: string;
  businessName: string;
  /** What the scan charges when it runs again, and whose credits it uses. */
  credits: number;
  agencyName: string;
  /** Why it stopped, in the same plain words as the Error column. */
  reason: string | null;
  retry: Retry;
};

/** "Retrying uses about 6 credits from Acme Agency.": active questions times models, what a full scan charges. */
function retryCostText(credits: number, agencyName: string): string {
  return `Retrying uses about ${plural(credits, "credit", "credits")} from ${agencyName || "the agency"}.`;
}

/**
 * Retry on a failed or skipped scan, after one question (admin audit 2026-11-12): the question and the button say
 * the same thing, and the dialog shows why the scan stopped, so the admin can tell whether a retry will help.
 */
export default function RetryButton({ jobId, businessName, credits, agencyName, reason, retry }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run() {
    setConfirming(false);
    startTransition(async () => {
      const result = await retry({ jobId });
      if (result.ok) toast.success(`The scan for ${businessName} is waiting to run again.`);
      else toast.error(result.error);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" disabled={pending} aria-label={`Retry scan for ${businessName}`} onClick={() => setConfirming(true)}>
        <RotateCw aria-hidden className={cn(pending && "motion-safe:animate-spin")} />
        {pending ? "Retrying" : "Retry"}
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-md" role="alertdialog" data-testid="confirm-dialog">
          <DialogHeader>
            <DialogTitle>Retry the scan for {businessName}?</DialogTitle>
            <DialogDescription>{retryCostText(credits, agencyName)}</DialogDescription>
          </DialogHeader>
          {reason && (
            <div className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2 text-[length:calc(13px*var(--px,1))]">
              <p className="font-medium">Why it stopped</p>
              <p className="text-muted-foreground">{reason}</p>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={run}>
              Retry scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
