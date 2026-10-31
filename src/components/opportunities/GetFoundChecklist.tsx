"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, CircleCheck } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ActionResult } from "@/modules/auth";
import type { ChecklistItem, ChecklistKey } from "@/modules/opportunities";
import { CopyButton } from "./CopyButton";

type SetChecklist = (input: { businessId: string; key: ChecklistKey; done: boolean }) => Promise<ActionResult<{ done: boolean }>>;

// Errors the action returned are written for users; anything else (a dropped connection) gets a plain message.
class ActionError extends Error {}

function missingText(missing: string[]): string {
  if (missing.length === 1) return missing[0];
  return `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`;
}

/** A short name for each step, for the chips on the folded card (the full title is on hover and in the list). */
const SHORT: Record<ChecklistKey, string> = {
  google_profile: "Google profile",
  listings: "Yelp, Bing, Apple",
  reviews: "10 reviews",
  same_details: "Same details everywhere",
  website: "Website",
  directories: "Directories",
};

// MVP_SPEC 7.3: the fixed "get found by AI" list, ticked by hand. A compact progress card (mockup-ui) that opens to
// the full list with its tick boxes and Copy buttons; `defaultOpen` starts it open.
export function GetFoundChecklist({
  businessId,
  missing,
  initialItems,
  setItem,
  readOnly = false,
  defaultOpen = true,
}: {
  businessId: string;
  missing: string[];
  initialItems: ChecklistItem[];
  setItem: SetChecklist;
  /** An ended plan (MVP_SPEC 4.4): the ticks show, but can't change. */
  readOnly?: boolean;
  defaultOpen?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(defaultOpen);
  const [busy, setBusy] = useState<ChecklistKey | null>(null);
  const done = items.filter((i) => i.done).length;

  async function toggle(item: ChecklistItem) {
    const next = !item.done;
    setBusy(item.key);
    setItems((all) => all.map((i) => (i.key === item.key ? { ...i, done: next } : i)));
    try {
      const result = await setItem({ businessId, key: item.key, done: next });
      if (!result.ok) throw new ActionError(result.error);
    } catch (error) {
      setItems((all) => all.map((i) => (i.key === item.key ? { ...i, done: item.done } : i)));
      toast.error(error instanceof ActionError ? error.message : "That change could not be saved. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface" data-testid="get-found-checklist">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2.5 px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h2 className="text-[13.5px] font-semibold">Get found by AI</h2>
          <span className="text-[13px] text-muted-foreground">The basics AI checks first</span>
        </div>
        <div className="flex min-w-40 flex-1 items-center gap-3">
          <Progress value={(done / items.length) * 100} aria-label={`${done} of ${items.length} done`} className="h-1.5 flex-1 *:data-[slot=progress-indicator]:bg-good" />
          <span className="shrink-0 text-[13px] font-semibold tabular-nums" data-testid="checklist-progress">
            {done} of {items.length} done
          </span>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label="Checklist steps">
          {items.map((item) => (
            <li
              key={item.key}
              className={cn(
                "inline-flex h-[21px] items-center gap-1 rounded-sm px-1.5 text-[11.5px] font-medium whitespace-nowrap",
                item.done ? "bg-good-bg text-good-text" : "bg-muted text-muted-foreground",
              )}
              title={item.title}
            >
              {item.done && <CircleCheck className="size-3" aria-hidden="true" />}
              {SHORT[item.key]}
              <span className="sr-only">{item.done ? ", done" : ", to do"}</span>
            </li>
          ))}
        </ul>
        <Button type="button" variant="ghost" size="xs" className="ml-auto" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="checklist-toggle">
          {open ? "Hide steps" : "Show steps"}
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />
        </Button>
      </header>

      {open && (
        <div className="border-t border-border px-4 pt-4 pb-1 sm:px-5">
          <p className="max-w-[680px] text-sm text-muted-foreground">
            {/* "Couldn't confirm", not "no record": a Google profile is also unconfirmed when Google could not be reached at
                setup, or its listing did not match the website (2026-10-14). */}
            We couldn&apos;t confirm {missingText(missing)} for your business. AI assistants lean on these basics, so check them
            first.
          </p>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.key} className="flex gap-3 py-3.5" data-testid={`checklist-${item.key}`}>
                {/* The padding gives the 16px box a 40px tap area without moving it. */}
                <label className="-m-3 flex shrink-0 cursor-pointer self-start p-3">
                  <input
                    id={`check-${item.key}`}
                    type="checkbox"
                    checked={item.done}
                    disabled={readOnly || busy === item.key}
                    onChange={() => toggle(item)}
                    className={cn("mt-0.5 size-4 cursor-pointer rounded-sm accent-primary", readOnly ? "disabled:cursor-not-allowed" : "disabled:cursor-wait")}
                  />
                </label>
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={`check-${item.key}`} className={cn("cursor-pointer text-sm font-medium", item.done && "text-muted-foreground line-through")}>
                    {item.title}
                  </label>
                  <p className="max-w-[640px] text-[13px] text-muted-foreground">{item.detail}</p>
                  {item.copy && !item.done && (
                    <div className="mt-1.5">
                      <CopyButton
                        text={item.copy.text}
                        label={item.copy.kind === "claude" ? "Copy for Claude" : "Copy message"}
                        copiedNote={
                          item.copy.kind === "claude"
                            ? "Prompt copied. Paste it into Claude to get a draft."
                            : "Message copied. Add your review link before you send it."
                        }
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
