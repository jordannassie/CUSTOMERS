"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";
import { COMPARE_TABS, toCompareTab, type CompareTab } from "./tabs";

const tabFromUrl = (): CompareTab => toCompareTab(new URLSearchParams(window.location.search).get("tab"));

/**
 * The comparison's tabs (B-93). Every tab is rendered once on the server, so switching is instant: no new request
 * (2026-10-27: each tab used to reload the whole page). The address still changes, so Back, sharing and links work.
 */
export function CompareTabs({
  initial,
  panels,
  leads,
}: {
  initial: CompareTab;
  panels: Record<CompareTab, ReactNode>;
  /** Check-in: the serif lead of the message card holding the tabs, one per tab. */
  leads?: Record<CompareTab, string>;
}) {
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
      {leads && <h2 className="font-serif text-[20px] leading-[1.35] font-normal sm:text-[22px]">{leads[active]}</h2>}
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Comparison" className="flex w-max flex-nowrap gap-2 sm:w-full sm:flex-wrap">
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
                "flex min-h-11 items-center rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
                t.id === active
                  ? "border-brand bg-brand font-semibold text-primary-foreground"
                  : "border-border-strong bg-surface text-foreground hover:border-brand hover:text-brand-strong",
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
