"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

const FOOTER_ITEM =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0";

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
    <div className="flex min-h-full flex-col gap-3 p-3">
      <Link href="/dashboard" onClick={onNavigate} className="self-start px-2 pt-2 pb-1" aria-label="Customers.Direct, go to Overview">
        <Image src="/images/logos/logo-black.png" alt="" width={156} height={52} loading="eager" className="h-[52px] w-auto -my-3" />
      </Link>

      {settingUp ? (
        <div className="rounded-md border border-border bg-surface px-3 py-2.5" data-testid="setting-up">
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

      <nav aria-label="Main" className="flex flex-col gap-2.5">
        {APP_NAV_GROUPS.map((group) => (
          <div key={group.label ?? "top"} className="flex flex-col gap-0.5">
            {group.label && <p className="px-2.5 pt-1 pb-1 text-[11.5px] font-medium text-text-hint">{group.label}</p>}
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
                    "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-surface font-medium text-foreground shadow-[0_0_0_1px_var(--cd-border),0_1px_2px_rgb(24_24_27/0.04)]"
                      : "text-foreground/80 hover:bg-surface/70 hover:text-foreground",
                  )}
                >
                  <Icon className={cn("size-[15px] shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2.5">
        {usage && <UsageWidget {...usage} />}
        <div className="flex flex-col gap-0.5 border-t border-border pt-2.5">
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
