"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/auth";
import type { ScanStatus } from "@/modules/jobs";

type ScanAction = (input: unknown) => Promise<ActionResult<ScanStatus>>;

const POLL_MS = 3000;
const ALREADY_RUNNING = "A scan is already running.";
const FAILED = "The last scan could not finish. Try again in a few minutes.";
const RETRYING = "The scan hit a problem. We'll try again in a few minutes.";

type Note = { text: string; tone: "muted" | "error" } | null;

/** Run scan (B-29, MVP_SPEC 6.4). The page passes the actions so this stays free of server imports. */
export function RunScanButton({
  businessId,
  initial,
  start,
  getStatus,
  className,
  label = "Run scan",
}: {
  businessId: string;
  initial: ScanStatus;
  start: ScanAction;
  getStatus: ScanAction;
  /** Placement classes for the button itself, since the wrapper is `contents`. */
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [note, setNote] = useState<Note>(initial.blockedReason ? { text: initial.blockedReason, tone: "muted" } : null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!status.scanning) return;
    const timer = setTimeout(async () => {
      const result = await getStatus({ businessId }).catch(() => null);
      // A dropped poll just tries again; the scan itself carries on.
      if (!result?.ok) return setStatus((s) => ({ ...s }));
      setStatus(result.data);
      if (!result.data.scanning) {
        setNote(
          result.data.lastResult === "failed"
            ? { text: FAILED, tone: "error" }
            : result.data.blockedReason
              ? { text: result.data.blockedReason, tone: "muted" }
              : { text: "Scan finished.", tone: "muted" },
        );
        router.refresh();
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [status, businessId, getStatus, router]);

  const scanning = status.scanning || pending;
  const blocked = !scanning && status.blockedReason !== null;
  const text = note?.text ?? (scanning ? (status.retrying ? RETRYING : "Results appear in about a minute.") : "");

  function run() {
    if (scanning) return setNote({ text: ALREADY_RUNNING, tone: "muted" });
    setNote(null);
    startTransition(async () => {
      const result = await start({ businessId }).catch(() => null);
      if (!result) return setNote({ text: "Could not start the scan. Check your connection and try again.", tone: "error" });
      if (result.ok) return setStatus(result.data);
      if (result.status === 409) {
        setStatus((s) => ({ ...s, scanning: true }));
        return setNote({ text: ALREADY_RUNNING, tone: "muted" });
      }
      setNote({ text: result.error, tone: "error" });
    });
  }

  // `contents` makes the button and its note items of the page's action row (a grid on phones, a flex row from sm), so
  // the note takes a full line of its own: under Run scan on a phone, under the whole row (right aligned) from sm up.
  return (
    <div className="contents">
      <Button
        type="button"
        onClick={run}
        disabled={blocked}
        aria-disabled={scanning || undefined}
        aria-describedby={text ? `run-scan-note-${businessId}` : undefined}
        className={cn(scanning && "cursor-progress", className)}
      >
        {scanning ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
        {scanning ? "Scanning…" : label}
      </Button>
      <p
        id={`run-scan-note-${businessId}`}
        role="status"
        className={cn(
          // Kept mounted (sr-only when empty) so the live region is in place before the first message.
          text ? "col-span-full -mt-1.5 basis-full text-left text-xs sm:order-last sm:text-right" : "sr-only",
          note?.tone === "error" ? "text-low-text" : "text-muted-foreground",
        )}
      >
        {text}
      </p>
    </div>
  );
}
