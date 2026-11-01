"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { ActionResult } from "@/modules/auth";
import { SiteIcon } from "@/components/app/SiteIcon";
import { Button } from "@/components/ui/button";

export type TrackAction = (input: { businessId: string; name: string }) => Promise<ActionResult<{ name: string }>>;

type Props = {
  businessId: string;
  /** text: "Named in 8 of 40 answers". */
  names: { name: string; answers: number; text: string; domain?: string | null }[];
  /** Answers with names read from them in the last 30 days. */
  answers: number;
  track: TrackAction;
  manageHref: string;
  /**
   * "table": a row per business with a share bar, edge to edge in its card (the Competitors page, mockup-ui); "grid": a
   * card per business; "list" elsewhere.
   */
  layout?: "list" | "grid" | "table";
};

/** Business, named in, share bar, Track. On a phone: the name and count on the left, Track on the right. */
const ROW = "grid text-[13px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-[18px] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.2fr)_5.5rem]";

// Businesses AI keeps naming that the user does not track (MVP_SPEC 8.1, D-74), one click to track each.
export function AlsoRecommended({ businessId, names, answers, track, manageHref, layout = "list" }: Props) {
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

  const errorNote = error ? (
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
  ) : null;
  const top = names[0].answers;
  const trackButton = (name: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      disabled={pending}
      onClick={() => onTrack(name)}
      aria-label={`Track ${name}`}
    >
      {busy === name ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
      Track
    </Button>
  );
  if (layout === "table") {
    // Each bar is the share of all answers, so the lengths compare across businesses and with the leaderboard.
    const share = (n: number) => (answers > 0 ? Math.round((100 * n) / answers) : 0);
    return (
      <div className="flex flex-col">
        <div className={cn(ROW, "border-b border-border bg-muted py-2.5 text-xs font-medium text-muted-foreground max-sm:hidden")} aria-hidden="true">
          <span>Business</span>
          <span>How often</span>
          <span>Share of answers</span>
          <span />
        </div>
        <ul className="flex flex-col divide-y divide-border" data-testid="also-recommended">
          {names.map((n) => (
            <li key={n.name} className={cn(ROW, "py-2.5")}>
              <span className="flex min-w-0 items-center gap-2.5">
                <SiteIcon domain={n.domain ?? null} name={n.name} size="sm" />
                <span className="truncate font-medium" title={n.name}>
                  {n.name}
                </span>
              </span>
              <span className="text-[13px] text-muted-foreground tabular-nums max-sm:col-start-1 max-sm:row-start-2 max-sm:pl-[34px] max-sm:text-xs">{n.text}</span>
              <span className="flex items-center gap-2.5 max-sm:hidden" aria-hidden="true">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-competitor-2" style={{ width: `${Math.max(share(n.answers), 2)}%` }} />
                </span>
                <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{share(n.answers)}%</span>
              </span>
              <span className="flex justify-end max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1">{trackButton(n.name)}</span>
            </li>
          ))}
        </ul>
        {error ? <div className="border-t border-border px-[18px] py-3">{errorNote}</div> : null}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <ul
        className={layout === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col divide-y divide-border"}
        data-testid="also-recommended"
      >
        {names.map((n) => (
          <li
            key={n.name}
            className={layout === "grid" ? "flex items-center gap-3 rounded-md border border-border bg-surface p-3" : "flex items-center gap-3 py-3 first:pt-0 last:pb-0"}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="truncate text-sm font-medium" title={n.name}>{n.name}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{n.text}</span>
              <span className="h-1 overflow-hidden rounded-xs bg-muted" aria-hidden>
                <span className="block h-full rounded-xs bg-competitor-2" style={{ width: `${(100 * n.answers) / top}%` }} />
              </span>
            </div>
            {trackButton(n.name)}
          </li>
        ))}
      </ul>
      {errorNote}
    </div>
  );
}
