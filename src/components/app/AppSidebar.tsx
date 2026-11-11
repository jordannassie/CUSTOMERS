"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { BusinessSwitcher, type SwitchBusinessAction, type SwitcherBusiness, type SwitcherDraft, type SwitcherScoresAction } from "./BusinessSwitcher";
import { APP_NAV_GROUPS, isNavActive, setupLabel } from "./nav";
import { SuggestFeatureDialog, type SuggestFeatureAction } from "./SuggestFeatureDialog";
import { UsageWidget, type UsageWidgetProps } from "./UsageWidget";
import { BrandLogo } from "./BrandLogo";

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

// Compact white menu (2026-11-10): grey for the page you are on and on hover, small enough to fit without scrolling.
const FOOTER_ITEM =
  "flex min-h-[30px] w-full items-center gap-2 rounded-[8px] px-2.5 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4 [&_svg]:shrink-0";

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
  // While another business is set up, the switcher's business is not the one on screen (BUG-092).
  const settingUp = pathname.startsWith("/onboarding");

  return (
    <div className="flex min-h-full flex-col gap-3 px-3 py-4">
      <Link href="/dashboard" onClick={onNavigate} className="self-start rounded-md px-2 py-1" aria-label="Customers.Direct, go to Overview">
        <BrandLogo height={19} priority />
      </Link>

      {settingUp ? (
        <div className="rounded-[14px] border border-border bg-surface px-3 py-2.5" data-testid="setting-up">
          <p className="text-[13px] text-muted-foreground">Setting up</p>
          <p className="line-clamp-2 text-sm font-medium break-words">
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

      <nav aria-label="Main" className="flex flex-col gap-2">
        {APP_NAV_GROUPS.map((group) => (
          <div key={group.label ?? "top"} className="flex flex-col gap-1">
            {group.label && <p className="px-2.5 pb-0.5 text-[11px] font-medium text-muted-foreground">{group.label}</p>}
            {group.items.map((item) => {
              const active = isNavActive(item, pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    // The page you are on is a grey pill on the white menu; others turn a lighter grey on hover.
                    "flex min-h-[30px] items-center gap-2 rounded-[8px] px-2.5 py-1 text-sm transition-colors",
                    active ? "bg-track font-semibold text-foreground" : "text-ink-2 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active ? "text-brand" : "text-muted-foreground")} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {usage && <UsageWidget {...usage} />}
        <div className="flex flex-col gap-0.5 border-t border-border pt-2">
          {isAdmin && (
            <Link href="/internal/admin" onClick={onNavigate} className={FOOTER_ITEM}>
              <ShieldCheck aria-hidden="true" />
              Admin
            </Link>
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
