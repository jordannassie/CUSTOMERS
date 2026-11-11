"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";

/**
 * A list that shows its first few items and a "Show all" button for the rest (Compare's fix cards). The items are
 * rendered by the page; this only decides how many are on screen.
 */
export function ShowMoreList({
  items,
  initial = 4,
  noun,
  className,
  testId,
}: {
  items: React.ReactNode[];
  initial?: number;
  /** Plural word for the button, for example "fixes": "Show all 12 fixes". */
  noun: string;
  className?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const hidden = items.length - initial;
  const shown = open || hidden <= 0 ? items : items.slice(0, initial);
  return (
    <div className="flex flex-col gap-3">
      <ol className={cn("flex flex-col gap-3", className)} data-testid={testId}>
        {shown}
      </ol>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-11 w-fit items-center gap-1.5 self-center rounded-full border border-border-strong bg-surface px-4 text-sm font-medium transition-colors hover:border-brand hover:text-brand-strong"
        >
          {open ? "Show fewer" : `Show all ${items.length} ${noun}`}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
