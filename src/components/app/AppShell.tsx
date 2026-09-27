"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppBanners, type AppBanner } from "./AppBanners";
import { AppSidebar, type AppSidebarProps } from "./AppSidebar";

type AppShellProps = AppSidebarProps & {
  banners: AppBanner[];
  /** Short balance for the phone top bar, so credits stay visible there too. */
  creditsShort: { text: string; empty: boolean } | null;
  children: React.ReactNode;
};

export function AppShell({ banners, creditsShort, children, ...sidebar }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-r border-border bg-muted lg:block">
        <AppSidebar {...sidebar} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-surface px-2 lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 gap-0 overflow-y-auto bg-muted p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Pages, business switcher and credits</SheetDescription>
              <AppSidebar {...sidebar} onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" aria-label="Customers.Direct, go to Overview" className="flex-1">
            <Image src="/images/logos/logo-black.png" alt="" width={120} height={30} className="h-7 w-auto" priority />
          </Link>
          {creditsShort && (
            <span
              data-testid="credits-short"
              className={cn(
                "rounded-sm px-2 py-1 text-xs font-medium tabular-nums",
                creditsShort.empty ? "bg-low-bg text-low-text" : "bg-muted text-muted-foreground",
              )}
            >
              {creditsShort.text}
            </span>
          )}
        </header>

        <AppBanners banners={banners} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
