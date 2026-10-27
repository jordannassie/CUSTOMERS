"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";
import { COMPARE_TABS, isCompareTab, type CompareTab } from "./tabs";

const tabFromUrl = (): CompareTab => {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return isCompareTab(tab) ? tab : "why";
};

/**
 * The comparison's tabs (B-93). Every tab is rendered once on the server, so switching is instant: no new request
 * (2026-10-27: each tab used to reload the whole page). The address still changes, so Back, sharing and links work.
 */
export function CompareTabs({ initial, panels }: { initial: CompareTab; panels: Record<CompareTab, ReactNode> }) {
  const [active, setActive] = useState<CompareTab>(initial);

  useEffect(() => {
    const onBack = () => setActive(tabFromUrl());
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);

  function open(tab: CompareTab) {
    if (tab === active) return;
    const url = new URL(window.location.href);
    if (tab === "why") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.pushState(null, "", url);
    setActive(tab);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Comparison" className="flex w-max gap-1 border-b border-border sm:w-full">
          {COMPARE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`compare-tab-${t.id}`}
              aria-selected={t.id === active}
              aria-controls={`compare-panel-${t.id}`}
              onClick={() => open(t.id)}
              className={cn(
                "relative flex h-10 items-center px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                t.id === active
                  ? "font-semibold text-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              data-testid={`compare-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {COMPARE_TABS.map((t) => (
        <div key={t.id} role="tabpanel" id={`compare-panel-${t.id}`} aria-labelledby={`compare-tab-${t.id}`} hidden={t.id !== active}>
          {panels[t.id]}
        </div>
      ))}
    </div>
  );
}
