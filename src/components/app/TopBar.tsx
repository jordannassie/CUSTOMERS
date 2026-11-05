"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins } from "lucide-react";
import { cn } from "cn";
import { activeNavItem } from "./nav";
import { PageSearch } from "./PageSearch";
import { SiteIcon } from "./SiteIcon";

type Props = {
  businessName: string | null;
  businessDomain: string | null;
  creditsShort: { text: string; empty: boolean } | null;
};

// mockup-ui: the desktop top bar. Where you are (business / page), page search, and the credit balance.
export function TopBar({ businessName, businessDomain, creditsShort }: Props) {
  const pathname = usePathname();
  const page = activeNavItem(pathname)?.label ?? null;

  return (
    <header className="sticky top-0 z-30 hidden h-14 shrink-0 items-center gap-3 bg-background/90 px-7 backdrop-blur-sm lg:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] whitespace-nowrap">
        {businessName && (
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 rounded-full px-2 py-1 font-medium hover:bg-surface">
            <SiteIcon domain={businessDomain} name={businessName} size="sm" className="size-5 text-[10px]" />
            <span className="truncate">{businessName}</span>
          </Link>
        )}
        {page && (
          <>
            <span className="text-border-strong" aria-hidden="true">/</span>
            <span className="text-muted-foreground" aria-current="page">{page}</span>
          </>
        )}
      </nav>
      <PageSearch />
      {creditsShort && (
        <Link
          href="/settings/usage"
          data-testid="credits-top"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium tabular-nums transition-colors",
            creditsShort.empty ? "border-low/30 bg-low-bg text-low-text" : "border-border bg-surface text-muted-foreground hover:border-border-strong",
          )}
        >
          <Coins className="size-3.5" aria-hidden="true" />
          {creditsShort.text}
        </Link>
      )}
    </header>
  );
}
