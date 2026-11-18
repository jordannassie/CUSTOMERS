"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AppAlert } from "@/modules/workspace";
import { AppAlertBell } from "./AppAlertBell";
import { AppBanners, type AppBanner } from "./AppBanners";
import { AppSidebar, type AppSidebarProps } from "./AppSidebar";
import { ScanWatcher, type ScanStatusAction } from "./ScanWatcher";
import { SkipLink } from "./SkipLink";
import { TestModePill } from "./TestModePill";
import { TopBar } from "./TopBar";

type AppShellProps = AppSidebarProps & {
  banners: AppBanner[];
  /** The alert bell's list, on the desktop top bar and the phone header. */
  alerts: AppAlert[];
  /** A test agency (D-61): a Test mode pill in the top bar, instead of a bar on every page. */
  testMode: boolean;
  /** Short balance for the phone top bar, so credits stay visible there too. */
  creditsShort: { text: string; empty: boolean } | null;
  /** Asked while a scan runs, so its end is announced on any app page. */
  getScanStatus: ScanStatusAction;
  children: React.ReactNode;
};

export function AppShell({
  banners,
  alerts,
  testMode,
  creditsShort,
  getScanStatus,
  children,
  ...sidebar
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const names = useMemo(
    () => Object.fromEntries(sidebar.businesses.map((b) => [b.id, b.name])),
    [sidebar.businesses],
  );

  // mockup-ui frame: the sidebar on the grey frame, then a white rounded window with the top bar and the page.
  return (
    <div className="app-v2 app-compact flex min-h-dvh bg-muted">
      <SkipLink />
      <ScanWatcher
        getStatus={getScanStatus}
        names={names}
        activeBusinessId={sidebar.activeBusinessId}
      />
      <aside className="scroll-quiet sticky top-0 hidden h-dvh w-[calc(212px*var(--px,1))] shrink-0 overflow-y-auto lg:block">
        <AppSidebar {...sidebar} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div className="flex min-h-full flex-1 flex-col bg-background lg:rounded-xl lg:border lg:border-border">
          <TopBar
            businessName={names[sidebar.activeBusinessId] ?? null}
            businessDomain={sidebar.businesses.find((b) => b.id === sidebar.activeBusinessId)?.domain ?? null}
            creditsShort={creditsShort}
            alerts={alerts}
            testMode={testMode}
          />
          <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-surface px-2 lg:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="scroll-quiet w-72 gap-0 overflow-y-auto bg-muted p-0"
              >
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Pages, business switcher and credits
                </SheetDescription>
                <AppSidebar
                  {...sidebar}
                  onNavigate={() => setMenuOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <Link
              href="/dashboard"
              aria-label="Customers.Direct, go to Overview"
              className="min-w-0 flex-1"
            >
              {/* The trimmed wordmark: the full file is mostly empty margin, so at h-7 it read at half the desktop size (BUG-305).
                  object-contain: squeezed by the pills, it shrinks instead of stretching out of shape. */}
              <Image
                src="/images/logos/logo-black-sidebar.png"
                alt=""
                width={640}
                height={89}
                loading="eager"
                className="h-4 w-auto max-w-full object-contain object-left"
              />
            </Link>
            {testMode && <TestModePill />}
            {creditsShort && (
              <span
                data-testid="credits-short"
                className={cn(
                  "rounded-sm px-2 py-1 text-xs font-medium tabular-nums",
                  creditsShort.empty
                    ? "bg-low-bg text-low-text"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {creditsShort.text}
              </span>
            )}
            <AppAlertBell alerts={alerts} />
          </header>

          <AppBanners banners={banners} />
          <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
