"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
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

// MVP_SPEC 7.3: the fixed "get found by AI" list, ticked by hand.
export function GetFoundChecklist({
  businessId,
  missing,
  initialItems,
  setItem,
  readOnly = false,
}: {
  businessId: string;
  missing: string[];
  initialItems: ChecklistItem[];
  setItem: SetChecklist;
  /** An ended plan (MVP_SPEC 4.4): the ticks show, but can't change. */
  readOnly?: boolean;
}) {
  const [items, setItems] = useState(initialItems);
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
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5" data-testid="get-found-checklist">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-[620px] flex-col gap-3">
          <h2 className="text-base font-semibold tracking-[-0.02em]">Get found by AI</h2>
          <p className="text-sm text-muted-foreground">
            {/* "Couldn't confirm", not "no record": a Google profile is also unconfirmed when Google could not be reached at
                setup, or its listing did not match the website (2026-10-14). */}
            We couldn&apos;t confirm {missingText(missing)} for your business. AI assistants lean on these basics, so check them
            first.
          </p>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-44">
          <span className="text-[13px] tabular-nums text-muted-foreground" data-testid="checklist-progress">
            {done} of {items.length} done
          </span>
          <Progress value={(done / items.length) * 100} aria-label={`${done} of ${items.length} done`} />
        </div>
      </header>

      <ul className="flex flex-col divide-y divide-border border-t border-border">
        {items.map((item) => (
          <li key={item.key} className="flex gap-3 py-4 last:pb-0" data-testid={`checklist-${item.key}`}>
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
              <label
                htmlFor={`check-${item.key}`}
                className={`cursor-pointer text-sm font-medium ${item.done ? "text-muted-foreground line-through" : ""}`}
              >
                {item.title}
              </label>
              <p className="max-w-[640px] text-sm text-muted-foreground">{item.detail}</p>
              {item.copy && !item.done && (
                <div className="mt-2">
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
    </section>
  );
}
