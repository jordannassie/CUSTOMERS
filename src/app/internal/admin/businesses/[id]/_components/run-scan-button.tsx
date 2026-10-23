"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import { cn } from "cn";
import ConfirmDialog, { scanCostMessage } from "../../../_components/confirm-dialog";

type Props = {
  businessId: string;
  active: boolean;
  /** Why a scan can't run, or null when it can. */
  blocked: string | null;
  /** What a full scan charges (active questions times models), and whose credits it uses. */
  credits: number;
  agencyName: string | null;
  runScanNow: (input: { businessId: string }) => Promise<ActionResult<{ jobId: string }>>;
};

export default function RunScanButton({ businessId, active, blocked, credits, agencyName, runScanNow }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await runScanNow({ businessId });
      setMessage(
        result.ok
          ? { tone: "ok", text: "Scan queued. It runs within about a minute." }
          : { tone: "error", text: result.error },
      );
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <Button onClick={() => setConfirming(true)} disabled={pending || active || blocked !== null}>
        <RefreshCw aria-hidden className={cn(pending && "motion-safe:animate-spin")} />
        {pending ? "Queuing scan" : active ? "Scan in progress" : "Run scan now"}
      </Button>
      <p
        aria-live="polite"
        className={cn("text-[13px]", message?.tone === "error" ? "text-low-text" : "text-muted-foreground")}
      >
        {message?.text ?? (active ? "A scan is already queued or running." : blocked)}
      </p>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Run a scan now?"
        message={scanCostMessage(credits, agencyName)}
        confirmLabel="Run scan"
        onConfirm={run}
      />
    </div>
  );
}
