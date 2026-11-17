"use client";

import Image from "next/image";
import { HoverPrefetchLink } from "@/components/app/HoverPrefetchLink";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { BusinessSwitcher, type SwitchBusinessAction, type SwitcherBusiness, type SwitcherDraft, type SwitcherScoresAction } from "./BusinessSwitcher";
import { APP_NAV_GROUPS, isNavActive, setupLabel } from "./nav";
import { SuggestFeatureDialog, type SuggestFeatureAction } from "./SuggestFeatureDialog";
import { UsageWidget, type UsageWidgetProps } from "./UsageWidget";

export type AppSidebarProps = {
  businesses: SwitcherBusiness[];
  activeBusinessId: string;
  switchBusiness: SwitchBusinessAction;
  switcherScores?: SwitcherScoresAction;
  usage: UsageWidgetProps | null;
  isAdmin: boolean;
  /** The business being set up, shown instead of the switcher on setup pages (BUG-092). */
  setupName?: string | null;
  /** The agency's unfinished draft, offered in the switcher as "Finish setting up <name>". */
  draft?: SwitcherDraft | null;
  suggestFeature: SuggestFeatureAction;
};

// One row style for menu links and footer links: 32px tall, 16px icon, a light blue tint on the page you are on.
const ROW =
  "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[length:calc(12.5px*var(--px,1))] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50";
const ROW_IDLE = "text-foreground/75 hover:bg-foreground/5 hover:text-foreground";
const FOOTER_ITEM = cn(ROW, ROW_IDLE, "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75] [&_svg]:text-muted-foreground");
const GROUP_LABEL = "px-2.5 pb-1 text-[length:calc(11px*var(--px,1))] font-medium text-text-hint";

export function AppSidebar({
  businesses,
  activeBusinessId,
  switchBusiness,
  switcherScores,
  usage,
  isAdmin,
  setupName = null,
  draft = null,
  suggestFeature,
  onNavigate,
}: AppSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  // The item clicked is highlighted at once, not only when the address changes, so two items are never lit together
  // while the next page loads (owner, 2026-11-17). Once the address moves on, it decides again.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null);
  const current = clicked && clicked.from === pathname ? clicked.href : pathname;

  // Each menu page's loading screen is fetched once, when the browser is idle, so a click shows the right one at once
  // instead of a general one or nothing (owner, 2026-11-17). For these pages Next fetches only down to their
  // loading.js, never the page itself, and keeps what it fetched: asking again after each page change only fetches
  // the page just left, which Next skips while it is open (the Overview, where the app starts).
  useEffect(() => {
    const hrefs = APP_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.href));
    const run = () => hrefs.forEach((href) => router.prefetch(href));
    // Safari has no requestIdleCallback: a short wait does the same there.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(run, 1500);
    return () => clearTimeout(id);
  }, [router, pathname]);

  // While another business is set up, the switcher's business is not the one on screen (BUG-092).
  const settingUp = pathname.startsWith("/onboarding");

  return (
    <div className="flex min-h-full flex-col px-3 pb-3">
      {/* The logo level with the window's top bar, its left edge in line with the menu's icons (owner, 2026-11-17:
          not centred), from a copy trimmed of the file's empty margins. */}
      <div className="mt-2 mb-2 flex h-12 shrink-0 items-center px-2.5">
        <HoverPrefetchLink href="/dashboard" onClick={onNavigate} aria-label="Customers.Direct, go to Overview" className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Image src="/images/logos/logo-black-sidebar.png" alt="" width={640} height={89} loading="eager" className="h-5 w-auto" />
        </HoverPrefetchLink>
      </div>

      {settingUp ? (
        <div className="rounded-md border border-border bg-surface px-2.5 py-1.5" data-testid="setting-up">
          <p className="text-[length:calc(11px*var(--px,1))] text-muted-foreground">Setting up</p>
          <p className="line-clamp-2 text-[length:calc(13px*var(--px,1))] font-medium break-words">
            {setupLabel(pathname, setupName, businesses.find((b) => b.id === activeBusinessId)?.name ?? null)}
          </p>
        </div>
      ) : (
        <BusinessSwitcher
          businesses={businesses}
          activeBusinessId={activeBusinessId}
          switchBusiness={switchBusiness}
          onSwitched={onNavigate}
          loadScores={switcherScores}
          draft={draft}
        />
      )}

      <nav aria-label="Main" className="mt-4 flex flex-col gap-4">
        {APP_NAV_GROUPS.map((group) => (
          <div key={group.label ?? "top"} className="flex flex-col gap-0.5">
            {group.label && <p className={GROUP_LABEL}>{group.label}</p>}
            {group.items.map((item) => {
              const active = isNavActive(item, current);
              const Icon = item.icon;
              return (
                <HoverPrefetchLink
                  key={item.href}
                  href={item.href}
                  onClick={(event) => {
                    // A click that opens a new tab leaves this page as it is.
                    if (!(event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1)) setClicked({ href: item.href, from: pathname });
                    onNavigate?.();
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(ROW, active ? "bg-primary-tint font-medium text-primary" : ROW_IDLE)}
                >
                  <Icon
                    className={cn("size-4 shrink-0 stroke-[1.75]", active ? "text-primary" : "text-muted-foreground")}
                    aria-hidden="true"
                  />
                  {item.label}
                </HoverPrefetchLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2.5 pt-5">
        {usage && <UsageWidget {...usage} />}
        <div className="flex flex-col gap-0.5 border-t border-border pt-2.5">
          {isAdmin && (
            <HoverPrefetchLink href="/internal/admin" onClick={onNavigate} className={FOOTER_ITEM}>
              <ShieldCheck aria-hidden="true" />
              Admin
            </HoverPrefetchLink>
          )}
          <SuggestFeatureDialog businessId={activeBusinessId} triggerClassName={FOOTER_ITEM} suggest={suggestFeature} />
          <form action="/auth/signout" method="post">
            <button type="submit" className={FOOTER_ITEM}>
              <LogOut aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
