"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EXTRA_ITEMS, MAIN_ITEMS, isActiveItem, type AdminNavItem } from "./nav-items";
import { appFetch } from "@/lib/session-expired";

function useUnreadLeads(pathname: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    appFetch("/api/internal/admin/leads?count=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (typeof d?.count === "number") setCount(d.count);
      })
      .catch(() => {});
  }, [pathname]);
  return count;
}

function NavLink({
  item,
  pathname,
  badge,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  badge?: number;
  onNavigate?: () => void;
}) {
  const active = isActiveItem(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] transition-colors duration-150 ease-out",
        active
          ? "bg-surface font-semibold text-foreground [&>svg]:text-brand"
          : "text-ink-2 hover:bg-surface/60 hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate" title={item.label}>{item.label}</span>
      {badge ? (
        <span
          className={cn(
            "tabular ml-auto rounded-full px-2 text-[12px] font-semibold leading-5",
            active ? "bg-brand text-primary-foreground" : "bg-brand-tint text-brand-ink",
          )}
        >
          {badge > 99 ? "99+" : badge}
          <span className="sr-only"> unread</span>
        </span>
      ) : null}
    </Link>
  );
}

function NavBody({ adminEmail, onNavigate }: { adminEmail: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const unread = useUnreadLeads(pathname);

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {MAIN_ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink item={item} pathname={pathname} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        <ul aria-label="Other tools" className="mt-6 flex flex-col gap-0.5 border-t border-border pt-4">
          {EXTRA_ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink
                item={item}
                pathname={pathname}
                badge={item.label === "Leads" ? unread : undefined}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-border px-4 py-4">
        <Link
          href="/dashboard"
          className="mb-3 flex items-center gap-2 text-[13px] text-muted-foreground transition-colors duration-150 ease-out hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to dashboard
        </Link>
        <p className="truncate text-[12px] text-text-hint" title={adminEmail}>
          Signed in as {adminEmail}
        </p>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Link href="/internal/admin" className="flex items-center gap-2">
      <span className="font-serif text-lg text-foreground">Customers.Direct</span>
      <span className="rounded-full bg-foreground px-2 text-[12px] font-semibold leading-5 text-background">Admin</span>
    </Link>
  );
}

export default function AdminNav({ adminEmail }: { adminEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col lg:flex">
        <div className="px-5 pt-6 pb-2">
          <Logo />
        </div>
        <NavBody adminEmail={adminEmail} />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <Logo />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open admin menu">
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 bg-background p-0">
            <SheetTitle className="border-b border-border px-5 py-4 text-[14px]">Admin menu</SheetTitle>
            <NavBody adminEmail={adminEmail} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
