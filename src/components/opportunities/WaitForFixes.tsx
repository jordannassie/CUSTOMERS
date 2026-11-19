"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";

export type CheckFixesAction = (input: { businessId: string }) => Promise<ActionResult<{ pending: boolean }>>;

const EVERY_MS = 5_000;
// The server stops calling fixes pending after a few minutes; this stops asking a little later in any case.
const GIVE_UP_MS = 7 * 60_000;

// Shown between a finished scan and its saved fixes (MVP_SPEC 7.2): asks every few seconds, then reloads the page's
// data once the fixes are saved, so the list appears without a manual refresh.
export function WaitForFixes({ businessId, check, compact = false }: { businessId: string; check: CheckFixesAction; compact?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    let stopped = false;
    const timer = setInterval(async () => {
      if (stopped) return;
      if (Date.now() - started > GIVE_UP_MS) {
        clearInterval(timer);
        return;
      }
      const result = await check({ businessId }).catch(() => null);
      if (result?.ok && !result.data.pending) {
        stopped = true;
        clearInterval(timer);
        toast.success("Your fixes are ready.", { description: "See what to change to show up in more AI answers." });
        router.refresh();
      }
    }, EVERY_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [businessId, check, router]);

  return (
    <p
      role="status"
      className={compact ? "flex items-center gap-2 text-sm text-muted-foreground" : "flex items-center gap-2 text-sm font-medium"}
      data-testid="fixes-pending"
    >
      <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
      Working out your fixes. This takes about a minute.
    </p>
  );
}
