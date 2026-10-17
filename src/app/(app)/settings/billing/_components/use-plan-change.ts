"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PlanChangeResult } from "@/modules/billing";

export type ChangeAction = (input: unknown) => Promise<PlanChangeResult>;

export type Preview = {
  headline: string;
  details: string[];
  losses?: { heading: string; items: string[] };
  previewedAt: number;
};

// Every plan change is two steps (D-57): the action first returns the price effect, then applies it with that
// preview's previewedAt, so the amount charged is the amount shown.
// A refusal (trial limit, plan already chosen) won't change on a retry; a stale price, a declined card or an
// outage can.
const failure = (r: { status: number; error: string }) => ({ message: r.error, retry: r.status === 402 || r.status === 409 || r.status >= 500 });

/** The preview, then the confirm, for one dialog. `extra` is sent with the confirm only (the cancel reason). */
export function usePlanChange(action: ChangeAction, input: Record<string, unknown>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  function loadPreview() {
    setPreview(null);
    setError(null);
    startLoading(async () => {
      const result = await action(input);
      if (!result.ok) return setError(failure(result));
      if (result.data.step === "preview") setPreview(result.data);
    });
  }

  function start() {
    setOpen(true);
    loadPreview();
  }

  function confirm(extra: Record<string, unknown> = {}) {
    if (!preview) return;
    setError(null);
    startSaving(async () => {
      const result = await action({ ...input, ...extra, previewedAt: preview.previewedAt });
      if (!result.ok) {
        // Nothing changed; "Try again" fetches a fresh price before another confirm.
        setPreview(null);
        return setError(failure(result));
      }
      if (result.data.step === "done") {
        toast.success(result.data.message);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return { open, setOpen: (next: boolean) => !saving && setOpen(next), start, loadPreview, confirm, preview, error, loading, saving };
}
