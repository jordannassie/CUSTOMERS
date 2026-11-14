"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "cn";

export type FilterTab = {
  key: string;
  label: string;
  /** The URL with this filter on, so it can be shared, reloaded and opened in a new tab. */
  href: string;
  count?: number;
  /** Counts that need a look (failed, payment failed) turn the warning orange above 0. */
  alert?: boolean;
};

/**
 * One filter bar for every admin list, the same height everywhere, with the filter in the URL. Server pages pass
 * links only; a client page passes onSelect to switch without a reload, and keeps the URL in step itself.
 */
export default function FilterTabs({
  label,
  tabs,
  active,
  onSelect,
  disabled,
  scroll = false,
}: {
  label: string;
  tabs: FilterTab[];
  active: string;
  onSelect?: (key: string) => void;
  disabled?: boolean;
  /** On phones, one row that scrolls sideways instead of wrapping (Agencies, which has 11 tabs; QA round 2, item 16). */
  scroll?: boolean;
}) {
  const row = useRef<HTMLElement>(null);
  // A scrolling row opens with the chosen filter in view, not cut off at the right edge.
  useEffect(() => {
    if (!scroll) return;
    row.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [scroll, active]);
  return (
    // Wraps on phones by default, so no filter is hidden off the edge; `scroll` keeps one row that scrolls sideways
    // below sm instead, and wraps again from sm.
    <nav ref={row} aria-label={label} className={cn(scroll && "max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:[scrollbar-width:none]")}>
      <ul className={cn("flex gap-0.5 rounded-md border border-border bg-muted p-1", scroll ? "w-max sm:w-full sm:flex-wrap" : "w-full flex-wrap")}>
        {tabs.map((t) => {
          const current = t.key === active;
          return (
            <li key={t.key} className={scroll ? "flex-none sm:flex-auto" : "flex-auto"}>
              <Link
                href={t.href}
                scroll={false}
                aria-current={current ? "page" : undefined}
                aria-disabled={disabled || undefined}
                tabIndex={disabled ? -1 : undefined}
                onClick={(e) => {
                  if (disabled) return e.preventDefault();
                  if (!onSelect || e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  onSelect(t.key);
                }}
                className={cn(
                  "flex h-8 items-center justify-center gap-1.5 rounded-sm px-2 text-[length:calc(13px*var(--px,1))] font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  current ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  disabled && "pointer-events-none opacity-50",
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span className={cn("text-[length:calc(12px*var(--px,1))] tabular-nums", t.alert && t.count > 0 ? "font-semibold text-mid-text" : "text-text-hint")}>
                    {t.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Puts a client-side filter change into the address bar without a navigation. */
export function replaceQuery(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(null, "", url);
}
