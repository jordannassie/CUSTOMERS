"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActionResult } from "@/modules/auth";

export type PlanStatusAction = () => Promise<ActionResult<{ started: boolean }>>;

// Each check reads the plan back from Stripe on the server (A1, 2026-10-15), so a missed webhook never leaves these
// screens waiting. Every 3 seconds for 30 seconds, then "Check again" runs the same check on demand.
export const POLL_MS = 3000;
export const SLOW_AFTER_MS = 30_000;

/** Polls `status` while `active`; `onStarted` runs once the plan has started. */
export function usePlanStatus(status: PlanStatusAction, active: boolean, onStarted: () => void) {
  const [slow, setSlow] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!active) return;
    const until = Date.now() + SLOW_AFTER_MS;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    async function poll() {
      const result = await status().catch(() => null);
      if (stopped) return;
      if (result?.ok && result.data.started) return onStarted();
      if (Date.now() >= until) return setSlow(true);
      timer = setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [active, status, onStarted]);

  const checkAgain = useCallback(async () => {
    setChecking(true);
    const result = await status().catch(() => null);
    setChecking(false);
    if (result?.ok && result.data.started) onStarted();
  }, [status, onStarted]);

  return { slow, checking, checkAgain };
}
