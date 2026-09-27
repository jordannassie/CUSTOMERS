"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { BusinessSwitcher, type SwitchBusinessAction, type SwitcherBusiness } from "./BusinessSwitcher";
import { APP_NAV, isNavActive } from "./nav";
import { SuggestFeatureDialog } from "./SuggestFeatureDialog";
import { UsageWidget, type UsageWidgetProps } from "./UsageWidget";

export type AppSidebarProps = {
  businesses: SwitcherBusiness[];
  activeBusinessId: string;
  switchBusiness: SwitchBusinessAction;
  usage: UsageWidgetProps | null;
  isAdmin: boolean;
};

const FOOTER_ITEM =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0";

export function AppSidebar({
  businesses,
  activeBusinessId,
  switchBusiness,
  usage,
  isAdmin,
  onNavigate,
}: AppSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <Link href="/dashboard" onClick={onNavigate} className="px-1.5 pt-2" aria-label="Customers.Direct, go to Overview">
        <Image src="/images/logos/logo-black.png" alt="" width={130} height={32} className="h-8 w-auto" />
      </Link>

      <BusinessSwitcher
        businesses={businesses}
        activeBusinessId={activeBusinessId}
        switchBusiness={switchBusiness}
        onSwitched={onNavigate}
      />

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {APP_NAV.map((item) => {
          const active = isNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "bg-primary-tint text-primary-hover"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-text-hint")} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {usage && <UsageWidget {...usage} />}
        <div className="flex flex-col gap-0.5 border-t border-border pt-3">
          {isAdmin && (
            <Link href="/internal/admin" onClick={onNavigate} className={FOOTER_ITEM}>
              <ShieldCheck aria-hidden="true" />
              Admin
            </Link>
          )}
          <SuggestFeatureDialog businessId={activeBusinessId} triggerClassName={FOOTER_ITEM} />
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
