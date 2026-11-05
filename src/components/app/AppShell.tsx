"use client";

import { useMemo, useState } from "react";
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
import { AppBanners, type AppBanner } from "./AppBanners";
import { AppSidebar, type AppSidebarProps } from "./AppSidebar";
import { ScanWatcher, type ScanStatusAction } from "./ScanWatcher";
import { SkipLink } from "./SkipLink";
import { TopBar } from "./TopBar";

type AppShellProps = AppSidebarProps & {
  banners: AppBanner[];
  /** Short balance for the phone top bar, so credits stay visible there too. */
  creditsShort: { text: string; empty: boolean } | null;
  /** Asked while a scan runs, so its end is announced on any app page. */
  getScanStatus: ScanStatusAction;
  children: React.ReactNode;
};

export function AppShell({
  banners,
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

  // Check-in frame: a 220px nav on the ground colour, then the page. Pages put their white cards straight on the ground.
  return (
    <div className="flex min-h-dvh bg-background">
      <SkipLink />
      <ScanWatcher
        getStatus={getScanStatus}
        names={names}
        activeBusinessId={sidebar.activeBusinessId}
      />
      <aside className="scroll-quiet sticky top-0 hidden h-dvh w-[220px] shrink-0 overflow-y-auto lg:block">
        <AppSidebar {...sidebar} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-full flex-1 flex-col">
          <TopBar
            businessName={names[sidebar.activeBusinessId] ?? null}
            businessDomain={sidebar.businesses.find((b) => b.id === sidebar.activeBusinessId)?.domain ?? null}
            creditsShort={creditsShort}
          />
          <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur-sm lg:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="scroll-quiet w-72 gap-0 overflow-y-auto bg-background p-0"
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
              className="flex-1 font-serif text-lg text-foreground"
            >
              Customers.Direct
            </Link>
            {creditsShort && (
              <span
                data-testid="credits-short"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
                  creditsShort.empty
                    ? "bg-low-bg text-low-text"
                    : "bg-surface text-muted-foreground",
                )}
              >
                {creditsShort.text}
              </span>
            )}
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
