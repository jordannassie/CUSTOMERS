"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EXTRA_ITEMS, MAIN_ITEMS, isActiveItem, usePageMissing, type AdminNavItem } from "./nav-items";
import { appFetch } from "@/lib/session-expired";

const LOGO = "/images/logos/logo-black-sidebar.png";

/** Fired by the Leads page when a lead is read or marked unread, so the badge updates at once. */
export const LEADS_CHANGED = "admin:leads-changed";
const UNREAD_EVERY_MS = 2 * 60 * 1000;

// Once when the admin opens, then every 2 minutes, on returning to the tab and when Leads changes one. It used to ask
// on every page switch: an extra server round trip per click, competing with the page itself (2026-11-12).
function useUnreadLeads(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () =>
      appFetch("/api/internal/admin/leads?count=1")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (typeof d?.count === "number") setCount(d.count);
        })
        .catch(() => {});
    const onVisible = () => document.visibilityState === "visible" && load();
    load();
    const timer = window.setInterval(load, UNREAD_EVERY_MS);
    window.addEventListener(LEADS_CHANGED, load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(LEADS_CHANGED, load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return count;
}

// The same row style as the app's sidebar (AppSidebar): 32px tall, 16px icon, a light blue tint on the page you are on.
const ROW =
  "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[length:calc(12.5px*var(--px,1))] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50";
const ROW_IDLE = "text-foreground/75 hover:bg-foreground/5 hover:text-foreground";
const GROUP_LABEL = "px-2.5 pb-1 text-[length:calc(11px*var(--px,1))] font-medium text-text-hint";

function NavLink({
  item,
  pathname,
  missing,
  badge,
  onNavigate,
}: {
  item: AdminNavItem;
  pathname: string;
  /** The page is the admin's Page not found, so no item is marked. */
  missing: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const active = !missing && isActiveItem(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(ROW, active ? "bg-primary-tint font-medium text-primary" : ROW_IDLE)}
    >
      <Icon className={cn("size-4 shrink-0 stroke-[1.75]", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
      <span className="truncate" title={item.label}>{item.label}</span>
      {badge ? (
        <span
          title="Unread leads: nobody has opened them yet"
          className={cn(
            "tabular ml-auto rounded-sm px-1.5 text-[length:calc(11px*var(--px,1))] font-medium leading-5",
            active ? "bg-surface text-primary" : "bg-primary-tint text-primary-hover",
          )}
        >
          {badge > 99 ? "99+" : badge}
          <span className="sr-only"> unread, nobody has opened them yet</span>
        </span>
      ) : null}
    </Link>
  );
}

function NavBody({ adminEmail, onNavigate }: { adminEmail: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const missing = usePageMissing(pathname);
  const unread = useUnreadLeads();

  return (
    <div className="flex flex-1 flex-col px-3 pb-3">
      <nav aria-label="Admin" className="mt-2 flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <p className={GROUP_LABEL}>Main</p>
          <ul className="flex flex-col gap-0.5">
            {MAIN_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink item={item} pathname={pathname} missing={missing} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className={GROUP_LABEL}>Other tools</p>
          <ul aria-label="Other tools" className="flex flex-col gap-0.5">
            {EXTRA_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  pathname={pathname}
                  missing={missing}
                  badge={item.label === "Leads" ? unread : undefined}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-2.5">
        <Link href="/dashboard" onClick={onNavigate} className={cn(ROW, ROW_IDLE)}>
          <ArrowLeft className="size-4 shrink-0 stroke-[1.75] text-muted-foreground" aria-hidden="true" />
          Back to dashboard
        </Link>
        {/* The whole address shows, on a second line if needed, instead of being cut off (admin audit 2026-11-12). */}
        <p className="px-2.5 text-[length:calc(11px*var(--px,1))] leading-snug text-text-hint">
          Signed in as <span className="block break-all text-muted-foreground">{adminEmail}</span>
        </p>
      </div>
    </div>
  );
}

// The app's centred logo (the trimmed copy), with a small dark "Admin" tag beside it.
function Logo() {
  return (
    <Link
      href="/internal/admin"
      className="flex items-center gap-2 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label="Customers.Direct admin, go to Overview"
    >
      <Image src={LOGO} alt="" width={640} height={89} loading="eager" className="h-[calc(18px*var(--px,1))] w-auto" />
      <span className="rounded-sm bg-foreground px-1.5 text-[length:calc(11px*var(--px,1))] font-medium leading-5 text-background">Admin</span>
    </Link>
  );
}

export default function AdminNav({ adminEmail }: { adminEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* The app's frame (AppShell): the menu on the grey frame, no divider, level with the window's top bar. */}
      <aside className="scroll-quiet sticky top-0 hidden h-dvh w-[calc(212px*var(--px,1))] shrink-0 flex-col overflow-y-auto lg:flex">
        <div className="mt-2 mb-2 flex h-12 shrink-0 items-center justify-center px-3">
          <Logo />
        </div>
        <NavBody adminEmail={adminEmail} />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <Logo />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open admin menu">
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="scroll-quiet w-72 gap-0 overflow-y-auto bg-muted p-0">
            <SheetTitle className="flex h-14 items-center px-5 text-[length:calc(13px*var(--px,1))]">Admin menu</SheetTitle>
            <NavBody adminEmail={adminEmail} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
