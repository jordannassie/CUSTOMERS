"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EXTRA_ITEMS, MAIN_ITEMS, isActiveItem } from "./nav-items";

// The window's top bar, like the app's (TopBar): where you are, as Admin / page.
export default function AdminTopBar() {
  const pathname = usePathname();
  const page = [...MAIN_ITEMS, ...EXTRA_ITEMS].find((item) => isActiveItem(item, pathname))?.label ?? null;
  return (
    <header className="sticky top-0 z-30 hidden h-12 shrink-0 items-center gap-3 rounded-t-xl border-b border-border bg-background/95 px-5 backdrop-blur-sm lg:flex">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] whitespace-nowrap">
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
    </header>
  );
}
