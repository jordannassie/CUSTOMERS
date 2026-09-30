"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { ActionResult } from "@/modules/auth";
import type { CompetitorCandidate, SavedCompetitor } from "@/modules/onboarding";
import { Button } from "@/components/ui/button";
import { AddCompetitor, type LookupAction } from "./AddCompetitor";
import { GoogleAttribution, PlaceRating } from "./PlaceBits";

type Picked = { name: string; placesId: string | null; live: CompetitorCandidate | null };

export type SaveCompetitorsAction = (input: {
  businessId: string;
  competitors: { name: string; placesId: string | null }[];
}) => Promise<ActionResult<{ count: number }>>;

export type CompetitorPickerProps = {
  businessId: string;
  /** Null when the plan sets no limit. */
  limit: number | null;
  /** "Your plan tracks up to 5 competitors." */
  limitText: string | null;
  saved: SavedCompetitor[];
  suggestions: CompetitorCandidate[];
  note: string | null;
  lookup: LookupAction;
  save: SaveCompetitorsAction;
  /** The onboarding wizard (B-36) moves to the next step here. */
  onSaved?: (count: number) => void;
  saveLabel?: string;
  /** The wizard's previous step. On desktop, Back and Save then sit in a row under the list like every other step. */
  backHref?: string;
};

const key = (name: string) => name.trim().toLowerCase();
const same = (a: { name: string; placesId: string | null }, b: { name: string; placesId: string | null }) =>
  (a.placesId !== null && a.placesId === b.placesId) || key(a.name) === key(b.name);
const sameList = (a: Picked[], b: Picked[]) => a.length === b.length && a.every((p, i) => same(p, b[i]));

// Onboarding step 5 (MVP_SPEC 3.1): tick nearby businesses from Google, add any it missed, and save.
export function CompetitorPicker(props: CompetitorPickerProps) {
  const { businessId, limit, limitText, suggestions, note, lookup, save, onSaved, saveLabel = "Save competitors", backHref } = props;
  const [picked, setPicked] = useState<Picked[]>(() => props.saved.map((s) => ({ ...s })));
  const [lastSaved, setLastSaved] = useState<Picked[]>(picked);
  const [limitHit, setLimitHit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isPicked = (c: { name: string; placesId: string | null }) => picked.some((p) => same(p, c));
  const full = limit !== null && picked.length >= limit;
  // The wizard always lets the user continue; the standalone page saves only real changes.
  const canSave = !pending && (Boolean(onSaved) || !sameList(picked, lastSaved));

  function add(c: Picked): boolean {
    if (isPicked(c)) return true;
    if (full) {
      setLimitHit(true);
      return false;
    }
    setPicked((list) => [...list, c]);
    return true;
  }

  function remove(c: { name: string; placesId: string | null }) {
    setLimitHit(false);
    setPicked((list) => list.filter((p) => !same(p, c)));
  }

  function toggle(s: CompetitorCandidate) {
    const c = { name: s.name, placesId: s.placeId, live: s };
    if (isPicked(c)) remove(c);
    else add(c);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await save({ businessId, competitors: picked.map(({ name, placesId }) => ({ name, placesId })) });
      if (!result.ok) return setError(result.error);
      setLastSaved(picked);
      // In the wizard the next step is the confirmation; a toast there would cover its Continue bar on a phone.
      if (onSaved) return onSaved(result.data.count);
      toast.success(result.data.count === 1 ? "1 competitor saved" : `${result.data.count} competitors saved`);
    });
  }

  const count = limit === null ? `${picked.length} picked` : `${picked.length} of ${limit} picked`;

  return (
    <div className="grid gap-8 pb-20 lg:grid-cols-[minmax(0,1fr)_340px] lg:pb-0">
      <div className="flex min-w-0 flex-col gap-8">
        <section aria-labelledby="suggested-title">
          <h2 id="suggested-title" className="text-base font-semibold tracking-[-0.02em]">
            Near you on Google
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Tick the ones customers compare you with.</p>
          {suggestions.length ? (
            <div className="mt-3 rounded-md border border-border bg-surface">
              <ul className="divide-y divide-border">
                {suggestions.map((s) => {
                  const checked = isPicked({ name: s.name, placesId: s.placeId });
                  return (
                    <li key={s.placeId}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-muted",
                          checked && "bg-primary-tint hover:bg-primary-tint",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(s)}
                          className="size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{s.name}</span>
                          {s.address ? <span className="block truncate text-[13px] text-muted-foreground">{s.address}</span> : null}
                        </span>
                        <PlaceRating rating={s.rating} reviewCount={s.reviewCount} />
                      </label>
                    </li>
                  );
                })}
              </ul>
              <GoogleAttribution className="border-t border-border px-4 py-2" />
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-3 rounded-md border border-dashed border-border bg-surface px-4 py-5">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-text-hint" />
              <p className="text-sm text-muted-foreground">{note ?? "No suggestions yet. Add competitors by name below."}</p>
            </div>
          )}
        </section>

        <section aria-labelledby="add-title">
          <h2 id="add-title" className="text-base font-semibold tracking-[-0.02em]">
            Add one we missed
          </h2>
          <p className="mb-3 mt-1 text-[13px] text-muted-foreground">Search Google by name, or add the name as you type it.</p>
          <AddCompetitor businessId={businessId} lookup={lookup} isPicked={isPicked} onAdd={add} />
        </section>
      </div>

      <aside aria-labelledby="list-title" className="self-start lg:sticky lg:top-8">
        <div className="rounded-md border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="list-title" className="text-base font-semibold tracking-[-0.02em]">
              Your competitors
            </h2>
            <span className="text-[13px] tabular-nums text-muted-foreground">{count}</span>
          </div>
          {limit !== null && limit <= 10 ? (
            <div className="mt-3 flex gap-1" aria-hidden>
              {Array.from({ length: limit }, (_, i) => (
                <span
                  key={i}
                  className={cn("h-1.5 flex-1 rounded-[2px] transition-colors duration-200 ease-out", i < picked.length ? "bg-primary" : "bg-border")}
                />
              ))}
            </div>
          ) : null}

          {picked.length ? (
            <ul className="mt-4 flex flex-col gap-1" aria-label="Picked competitors">
              {picked.map((p) => (
                <li key={p.placesId ?? key(p.name)} className="flex items-center gap-2 rounded-md py-1.5 pl-1">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{p.name}</span>
                    {!p.placesId ? <span className="block text-xs text-text-hint">Added by name</span> : null}
                  </span>
                  {p.live ? <PlaceRating rating={p.live.rating} reviewCount={p.live.reviewCount} /> : null}
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}>
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing picked yet. We&apos;ll check whether AI recommends these businesses instead of you.
            </p>
          )}
          {picked.some((p) => p.live) ? <GoogleAttribution className="mt-3" /> : null}

          {limitHit && limitText ? (
            <p role="status" className="mt-4 rounded-md bg-mid-bg px-3 py-2 text-[13px] text-mid-text">
              {limitText} Remove one to add another.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-4 rounded-md bg-low-bg px-3 py-2 text-[13px] text-low-text">
              {error}
            </p>
          ) : null}

          {backHref ? null : (
            <Button type="button" className="mt-5 hidden w-full lg:inline-flex" disabled={!canSave} onClick={submit}>
              {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
              {saveLabel}
            </Button>
          )}
        </div>
      </aside>

      {backHref ? (
        <div className="hidden items-center justify-between gap-3 lg:col-span-2 lg:flex">
          <Button asChild variant="ghost">
            <Link href={backHref}>
              <ArrowLeft aria-hidden />
              Back
            </Link>
          </Button>
          <Button type="button" disabled={!canSave} onClick={submit} className="min-w-32">
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {saveLabel}
          </Button>
        </div>
      ) : null}

      {/* On a phone the list sits below the fold, so the limit note and Save stay in reach here. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface px-5 py-3 lg:hidden">
        {limitHit && limitText ? (
          <p aria-hidden className="mb-2 rounded-md bg-mid-bg px-3 py-2 text-[13px] text-mid-text">
            {limitText}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] tabular-nums text-muted-foreground">{count}</span>
          <Button type="button" disabled={!canSave} onClick={submit}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
