"use client";

import Link from "next/link";
import { cn } from "cn";

export type FilterTab = {
  key: string;
  label: string;
  /** The URL with this filter on, so it can be shared, reloaded and opened in a new tab. */
  href: string;
  count?: number;
  /** Counts that need a look (failed, payment failed) turn red above 0. */
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
}: {
  label: string;
  tabs: FilterTab[];
  active: string;
  onSelect?: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    // Wraps on phones instead of scrolling, so no filter is ever hidden off the edge.
    <nav aria-label={label}>
      <ul className="flex w-fit max-w-full flex-wrap gap-1.5">
        {tabs.map((t) => {
          const current = t.key === active;
          return (
            <li key={t.key}>
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
                  // Check-in: filters as pills, the current one brand blue.
                  "flex h-8 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ease-out pointer-coarse:h-11",
                  current ? "border-brand bg-brand text-primary-foreground" : "border-border bg-surface text-ink-2 hover:border-border-strong hover:text-foreground",
                  disabled && "pointer-events-none opacity-50",
                )}
              >
                {t.label}
                {t.count !== undefined && (
                  <span
                    className={cn(
                      "text-[12px] tabular-nums",
                      // An alert count stays coral, on a small white badge when its pill is the selected one.
                      t.alert && t.count > 0 ? cn("font-semibold text-low-text", current && "rounded-full bg-surface px-1.5") : current ? "text-primary-foreground/85" : "text-muted-foreground",
                    )}
                  >
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
