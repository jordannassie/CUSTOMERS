"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/modules/auth";
import { Button } from "@/components/ui/button";

export type TrackAction = (input: { businessId: string; name: string }) => Promise<ActionResult<{ name: string }>>;

type Props = {
  businessId: string;
  /** text: "Named in 8 of 40 answers". */
  names: { name: string; answers: number; text: string }[];
  /** Answers with names read from them in the last 30 days. */
  answers: number;
  track: TrackAction;
  manageHref: string;
};

// Businesses AI keeps naming that the user does not track (MVP_SPEC 8.1, D-74), one click to track each.
export function AlsoRecommended({ businessId, names, answers, track, manageHref }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; limit: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  if (names.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="also-empty">
        {answers > 0
          ? "AI has not named any other businesses in the last 30 days."
          : "After your next scan, businesses AI names that you do not track show up here."}
      </p>
    );
  }

  function onTrack(name: string) {
    setError(null);
    setBusy(name);
    startTransition(async () => {
      const result = await track({ businessId, name });
      setBusy(null);
      if (!result.ok) return setError({ text: result.error, limit: result.status === 403 });
      toast.success(`${result.data.name} added to your competitors`);
      router.refresh();
    });
  }

  const top = names[0].answers;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border" data-testid="also-recommended">
        {names.map((n) => (
          <li key={n.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="truncate text-sm font-medium">{n.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{n.text}</span>
              <span className="h-1 overflow-hidden rounded-xs bg-muted" aria-hidden>
                <span className="block h-full rounded-xs bg-competitor-2" style={{ width: `${(100 * n.answers) / top}%` }} />
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => onTrack(n.name)}
              aria-label={`Track ${n.name}`}
            >
              {busy === n.name ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
              Track
            </Button>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="rounded-md bg-mid-bg px-3 py-2 text-[13px] text-mid-text">
          {error.text}
          {error.limit ? (
            <>
              {" "}
              <Link href={manageHref} className="font-medium underline">
                Manage list
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
