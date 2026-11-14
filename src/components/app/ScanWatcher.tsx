"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import type { ScanStatus } from "@/modules/jobs";
import { publishScanStatus, subscribeScans, unwatchScan, watchedScansKey } from "./scan-watch";

export type ScanStatusAction = (input: unknown) => Promise<ActionResult<ScanStatus>>;

const POLL_MS = 3000;
// A scan normally ends within about a minute; one that is still going after two asks less often.
const SLOW_POLL_MS = 10_000;
const SLOW_AFTER_MS = 2 * 60_000;
const FAILED = "could not finish. Try again in a few minutes.";

/**
 * Says when a scan ends, with a toast, on whichever app page the user is on by then (the Run scan button only showed
 * it next to itself, on the Overview). Mounted once in the app shell, so it keeps going across page changes.
 */
export function ScanWatcher({
  getStatus,
  names,
  activeBusinessId,
}: {
  getStatus: ScanStatusAction;
  names: Record<string, string>;
  activeBusinessId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const idsKey = useSyncExternalStore(subscribeScans, watchedScansKey, () => "");
  // Read when a scan ends, not when polling starts, so changing page does not restart the wait.
  const context = useRef({ names, activeBusinessId, pathname });
  useEffect(() => {
    context.current = { names, activeBusinessId, pathname };
  }, [names, activeBusinessId, pathname]);

  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",");
    const started = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    function announce(businessId: string, status: ScanStatus) {
      const { names, activeBusinessId, pathname } = context.current;
      const name = names[businessId];
      const forName = name ? ` for ${name}` : "";
      if (status.lastResult === "failed") {
        toast.error(status.failedReason ?? `The scan${forName} ${FAILED}`, { duration: 10_000 });
      } else if (status.lastResult === "done") {
        const view = businessId === activeBusinessId && pathname !== "/dashboard";
        toast.success(`Scan finished${forName}.`, {
          description: "Your score and answers are up to date.",
          duration: 8000,
          action: view ? { label: "View", onClick: () => router.push("/dashboard") } : undefined,
        });
      }
    }

    async function tick() {
      const results = await Promise.all(
        ids.map((businessId) =>
          getStatus({ businessId })
            .catch(() => null)
            .then((result) => ({ businessId, result })),
        ),
      );
      if (stopped) return;
      let ended = false;
      for (const { businessId, result } of results) {
        // A dropped poll just tries again; the scan itself carries on.
        if (!result) continue;
        // The business is gone or the session ended: nothing more to wait for.
        if (!result.ok) {
          unwatchScan(businessId);
          continue;
        }
        publishScanStatus(businessId, result.data);
        if (result.data.scanning) continue;
        ended = true;
        unwatchScan(businessId);
        announce(businessId, result.data);
      }
      // New scores, credits and fixes on whatever page is open.
      if (ended) router.refresh();
      if (!stopped) timer = setTimeout(tick, Date.now() - started > SLOW_AFTER_MS ? SLOW_POLL_MS : POLL_MS);
    }

    timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [idsKey, getStatus, router]);

  return null;
}
