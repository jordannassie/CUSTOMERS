"use client";

import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import ConfirmDialog, { scanCostMessage } from "../../_components/confirm-dialog";

type Retry = (input: { jobId: string }) => Promise<ActionResult<{ jobId: string }>>;

type Props = {
  jobId: string;
  businessName: string;
  /** What the scan charges when it runs again, and whose credits it uses. */
  credits: number;
  agencyName: string;
  retry: Retry;
};

export default function RetryButton({ jobId, businessName, credits, agencyName, retry }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run() {
    startTransition(async () => {
      const result = await retry({ jobId });
      if (result.ok) toast.success(`Scan for ${businessName} is queued again.`);
      else toast.error(result.error);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" disabled={pending} aria-label={`Retry scan for ${businessName}`} onClick={() => setConfirming(true)}>
        <RotateCw aria-hidden className={cn(pending && "motion-safe:animate-spin")} />
        {pending ? "Retrying" : "Retry"}
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Retry the scan for ${businessName}?`}
        message={scanCostMessage(credits, agencyName)}
        confirmLabel="Retry scan"
        onConfirm={run}
      />
    </>
  );
}
