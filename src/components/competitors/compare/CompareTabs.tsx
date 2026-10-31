"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";
import { COMPARE_TABS, toCompareTab, type CompareTab } from "./tabs";

const tabFromUrl = (): CompareTab => toCompareTab(new URLSearchParams(window.location.search).get("tab"));

/**
 * The comparison's tabs (B-93). Every tab is rendered once on the server, so switching is instant: no new request
 * (2026-10-27: each tab used to reload the whole page). The address still changes, so Back, sharing and links work.
 */
export function CompareTabs({ initial, panels }: { initial: CompareTab; panels: Record<CompareTab, ReactNode> }) {
  const [active, setActive] = useState<CompareTab>(initial);

  useEffect(() => {
    // An old link (?tab=websites, from before the redesign) gets the new tab name in the address, without a reload.
    const url = new URL(window.location.href);
    const asked = url.searchParams.get("tab");
    if (asked !== null && asked !== (initial === "summary" ? null : initial)) {
      if (initial === "summary") url.searchParams.delete("tab");
      else url.searchParams.set("tab", initial);
      window.history.replaceState(null, "", url);
    }
    const onBack = () => setActive(tabFromUrl());
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, [initial]);

  function open(tab: CompareTab) {
    if (tab === active) return;
    const url = new URL(window.location.href);
    if (tab === "summary") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.pushState(null, "", url);
    setActive(tab);
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Comparison" className="flex w-max gap-5 border-b border-border sm:w-full">
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
                "relative flex h-10 items-center px-0.5 text-[13px] whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                t.id === active
                  ? "font-medium text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground"
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
        <div key={t.id} role="tabpanel" id={`compare-panel-${t.id}`} aria-labelledby={`compare-tab-${t.id}`} hidden={t.id !== active} className="min-w-0">
          {panels[t.id]}
        </div>
      ))}
    </div>
  );
}
