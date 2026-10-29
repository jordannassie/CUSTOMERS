"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { quoteAround } from "@/lib/site-claims";

// The parts both website lists share (Compare's Website tab): a titled box whose rows open to each site's words, and
// one button that opens or closes every row.

export const pageName = (page: string | null) => (page === "/" ? "Home page" : page ? `${page} page` : "Their website");

/** Which rows are open, and the header button that opens all of them or closes all of them. */
export function useOpenRows(keys: string[], allOpen = false) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(allOpen ? keys : []));
  const everyOpen = keys.length > 0 && keys.every((k) => open.has(k));
  const toggle = (key: string) =>
    setOpen((now) => {
      const next = new Set(now);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAll = () => setOpen(everyOpen ? new Set() : new Set(keys));
  return { open, everyOpen, toggle, toggleAll };
}

/** A box with a title, a short summary beside it, the open-all button, and its rows. */
export function QuoteBox({
  title,
  summary,
  everyOpen,
  onToggleAll,
  head,
  children,
  testId,
}: {
  title: string;
  summary?: ReactNode;
  everyOpen: boolean;
  onToggleAll: () => void;
  head?: ReactNode;
  children: ReactNode;
  testId: string;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-md border border-border bg-surface" data-testid={testId} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-sm font-semibold">{title}</h3>
          {summary && <p className="text-xs text-muted-foreground">{summary}</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onToggleAll} aria-pressed={everyOpen}>
          {everyOpen ? "Hide quotes" : "Show all quotes"}
        </Button>
      </div>
      {head}
      <ul className="flex flex-col divide-y divide-border">{children}</ul>
    </section>
  );
}

/** One row: its line is a button that opens the two sites' words underneath. */
export function QuoteRow({
  label,
  open,
  onToggle,
  aside,
  children,
  testId,
  tone,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  aside: ReactNode;
  children: ReactNode;
  testId: string;
  tone?: "gap";
}) {
  return (
    <li className={cn(tone === "gap" && "bg-mid-bg/25")} data-testid={testId}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
      >
        <span className="truncate font-medium">{label}</span>
        {aside}
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && <div className="grid gap-3 px-4 pt-0.5 pb-4 sm:grid-cols-2">{children}</div>}
    </li>
  );
}

/** One site's words: who, the quote with a coloured edge, and the page it is on; or a plain line when there is none. */
export function Said({
  who,
  tone,
  about,
  quote,
  page,
  fallback,
}: {
  who: string;
  tone: "them" | "you";
  about: string;
  quote?: string | null;
  page?: string | null;
  fallback: string;
}) {
  return (
    <figure className={cn("m-0 flex flex-col gap-1 border-l-2 pl-3", tone === "you" ? "border-primary" : "border-competitor-1")}>
      <figcaption className={cn("truncate text-xs font-medium", tone === "you" ? "text-primary" : "text-muted-foreground")} title={who}>
        {who}
      </figcaption>
      {quote ? (
        <>
          <blockquote className="m-0 text-[13px] leading-relaxed text-foreground">&ldquo;{quoteAround(quote, about)}&rdquo;</blockquote>
          {page !== undefined && <span className="text-xs text-text-hint">{pageName(page ?? null)}</span>}
        </>
      ) : (
        <span className="text-[13px] text-muted-foreground">{fallback}</span>
      )}
    </figure>
  );
}
