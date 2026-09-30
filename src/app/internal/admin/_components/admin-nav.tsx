"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EXTRA_ITEMS, MAIN_ITEMS, isActiveItem, type AdminNavItem } from "./nav-items";
import { appFetch } from "@/lib/session-expired";

const LOGO = "/images/logos/logo-black.png";

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
  small,
  badge,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  small?: boolean;
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
        "flex items-center gap-2.5 rounded-md px-3 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        small ? "py-1.5 text-[13px]" : "py-2 text-[14px] font-medium",
        active
          ? "bg-primary-tint text-primary"
          : "text-muted-foreground hover:bg-surface hover:text-foreground",
      )}
    >
      <Icon className={cn("shrink-0", small ? "size-3.5" : "size-4")} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
      {badge ? (
        <span className="tabular ml-auto rounded-sm bg-primary px-1.5 text-[12px] font-medium leading-5 text-primary-foreground">
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
                small
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
      <Image src={LOGO} alt="Customers.Direct" width={72} height={24} loading="eager" className="h-6 w-auto" />
      <span className="rounded-sm bg-foreground px-1.5 text-[12px] font-medium leading-5 text-background">Admin</span>
    </Link>
  );
}

export default function AdminNav({ adminEmail }: { adminEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-muted lg:flex">
        <div className="border-b border-border px-5 py-4">
          <Logo />
        </div>
        <NavBody adminEmail={adminEmail} />
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <Logo />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open admin menu">
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 gap-0 bg-muted p-0">
            <SheetTitle className="border-b border-border px-5 py-4 text-[14px]">Admin menu</SheetTitle>
            <NavBody adminEmail={adminEmail} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
