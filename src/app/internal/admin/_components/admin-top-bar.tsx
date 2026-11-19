"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Resolve } from "../_overview/open-alerts";
import { AlertBell, type AlertBellData } from "./alert-bell";
import { EXTRA_ITEMS, MAIN_ITEMS, isActiveItem, usePageMissing } from "./nav-items";

// The window's top bar, like the app's (TopBar): where you are, as Admin / page, and the alert bell on the right.
export default function AdminTopBar({ bell, resolve }: { bell: AlertBellData; resolve: Resolve }) {
  const pathname = usePathname();
  const missing = usePageMissing(pathname);
  const page = missing ? "Page not found" : ([...MAIN_ITEMS, ...EXTRA_ITEMS].find((item) => isActiveItem(item, pathname))?.label ?? null);
  return (
    <header className="sticky top-0 z-30 hidden h-12 shrink-0 items-center gap-3 rounded-t-xl border-b border-border bg-background/95 px-5 backdrop-blur-sm lg:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[length:calc(13px*var(--px,1))] whitespace-nowrap">
        <Link href="/internal/admin" className="rounded-md px-1.5 py-1 font-medium hover:bg-muted">
          Admin
        </Link>
        {page && (
          <>
            <span className="text-border" aria-hidden="true">/</span>
            <span className="text-muted-foreground" aria-current="page">{page}</span>
          </>
        )}
      </nav>
      <div className="ml-auto">
        <AlertBell data={bell} resolve={resolve} />
      </div>
    </header>
  );
}
