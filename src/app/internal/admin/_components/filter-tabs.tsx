"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "cn";
import { LinkPendingSpinner } from "@/components/ui/link-pending";

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
}: {
  label: string;
  tabs: FilterTab[];
  active: string;
  onSelect?: (key: string) => void;
  disabled?: boolean;
}) {
  const row = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  // The row opens with the chosen filter in view, and fades at the right edge while more tabs are off screen.
  useEffect(() => {
    const nav = row.current;
    if (!nav) return;
    nav.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const check = () => setMore(nav.scrollWidth - nav.scrollLeft - nav.clientWidth > 4);
    check();
    nav.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      nav.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [active]);
  return (
    // Every admin tab bar works the same on a phone (BUG-323): one row that scrolls sideways, faded at the right edge
    // while more tabs are off screen (a cut "Trial ended 3" gave no sign of more). From sm up the row wraps.
    <nav
      ref={row}
      aria-label={label}
      className={cn(
        "max-sm:-mx-4 max-sm:overflow-x-auto max-sm:px-4 max-sm:[scrollbar-width:none]",
        more && "max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-48px),transparent)]",
      )}
    >
      <ul className="flex w-max gap-0.5 rounded-md border border-border bg-muted p-1 sm:w-full sm:flex-wrap">
        {tabs.map((t) => {
          const current = t.key === active;
          return (
            <li key={t.key} className="flex-none sm:flex-auto">
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
                  "flex h-8 items-center justify-center gap-1.5 rounded-sm px-2 sm:px-1.5 text-[length:calc(13px*var(--px,1))] font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
                <LinkPendingSpinner />
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
