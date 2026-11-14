"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import { cn } from "cn";
import RunScanDialog from "./run-scan-dialog";

type Props = {
  businessId: string;
  active: boolean;
  /** Why a scan can't run, or null when it can; and what to know before running one. */
  check: { blocked: string | null; warnings: string[]; credits: number };
  agencyName: string | null;
  runScanNow: (input: { businessId: string; reason: string }) => Promise<ActionResult<{ jobId: string }>>;
};

// "Waiting" is the word the status badge uses for a queued scan, so the messages here use it too.
export default function RunScanButton({ businessId, active, check, agencyName, runScanNow }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function run(reason: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await runScanNow({ businessId, reason });
      setMessage(
        result.ok
          ? { tone: "ok", text: "Scan added. It starts within about a minute." }
          : { tone: "error", text: result.error },
      );
    });
  }

  return (
    <div className="flex max-w-[calc(360px*var(--px,1))] flex-col items-start gap-1.5 sm:items-end sm:text-right">
      <Button onClick={() => setConfirming(true)} disabled={pending || active || check.blocked !== null}>
        <RefreshCw aria-hidden className={cn(pending && "motion-safe:animate-spin")} />
        {pending ? "Adding scan" : active ? "Scan in progress" : "Run scan now"}
      </Button>
      <p
        aria-live="polite"
        className={cn("text-[length:calc(13px*var(--px,1))]", message?.tone === "error" ? "text-low-text" : "text-muted-foreground")}
      >
        {message?.text ?? (active ? "A scan is already waiting or running." : check.blocked)}
      </p>
      <RunScanDialog
        open={confirming}
        onOpenChange={setConfirming}
        credits={check.credits}
        agencyName={agencyName}
        warnings={check.warnings}
        onConfirm={run}
      />
    </div>
  );
}
