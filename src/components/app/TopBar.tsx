"use client";

import { HoverPrefetchLink } from "@/components/app/HoverPrefetchLink";
import { usePathname } from "next/navigation";
import { Coins } from "lucide-react";
import { cn } from "cn";
import type { AppAlert } from "@/modules/workspace";
import { AppAlertBell } from "./AppAlertBell";
import { pageLabel } from "./nav";
import { PageSearch } from "./PageSearch";
import { SiteIcon } from "./SiteIcon";
import { TestModePill } from "./TestModePill";

type Props = {
  businessName: string | null;
  businessDomain: string | null;
  creditsShort: { text: string; empty: boolean } | null;
  alerts: AppAlert[];
  testMode: boolean;
};

// mockup-ui: the desktop top bar. Where you are (business / page), page search, the credit balance and the alert bell.
export function TopBar({ businessName, businessDomain, creditsShort, alerts, testMode }: Props) {
  const pathname = usePathname();
  const page = pageLabel(pathname);

  return (
    <header className="sticky top-0 z-30 hidden h-12 shrink-0 items-center gap-3 rounded-t-xl border-b border-border bg-background/95 px-5 backdrop-blur-sm lg:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[length:calc(13px*var(--px,1))] whitespace-nowrap">
        {businessName && (
          <HoverPrefetchLink href="/dashboard" className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 font-medium hover:bg-muted">
            <SiteIcon domain={businessDomain} name={businessName} size="sm" className="size-5 text-[length:calc(10px*var(--px,1))]" />
            <span className="truncate">{businessName}</span>
          </HoverPrefetchLink>
        )}
        {page && (
          <>
            <span className="text-border" aria-hidden="true">/</span>
            <span className="text-muted-foreground" aria-current="page">{page}</span>
          </>
        )}
        {testMode && <TestModePill />}
      </nav>
      <PageSearch />
      {creditsShort && (
        <HoverPrefetchLink
          href="/settings/usage"
          data-testid="credits-top"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium tabular-nums transition-colors",
            creditsShort.empty ? "border-low/30 bg-low-bg text-low-text" : "border-border bg-surface text-muted-foreground hover:bg-muted",
          )}
        >
          <Coins className="size-3.5" aria-hidden="true" />
          {creditsShort.text}
        </HoverPrefetchLink>
      )}
      {/* Last on the right, where the admin top bar has it (owner, 2026-11-17). */}
      <AppAlertBell alerts={alerts} />
    </header>
  );
}
