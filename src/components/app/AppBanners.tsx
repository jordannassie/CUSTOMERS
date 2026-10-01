"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Info, PauseCircle, type LucideIcon } from "lucide-react";
import { cn } from "cn";

export type AppBanner = {
  kind: "suspended" | "past_due" | "out_of_credits" | "trial" | "ended";
  tone: "danger" | "warning" | "info";
  message: string;
  action: { label: string; href: string } | null;
};

const TONE: Record<AppBanner["tone"], { box: string; icon: LucideIcon }> = {
  danger: { box: "divide-low/30 border-low/30 bg-low-bg text-low-text", icon: AlertTriangle },
  warning: { box: "divide-mid/30 border-mid/30 bg-mid-bg text-mid-text", icon: AlertTriangle },
  info: { box: "divide-primary/20 border-primary/20 bg-primary-tint text-primary-hover", icon: Info },
};

// Banners of the same tone share one box, so a past due agency that is also out of credits gets one block, not two.
function groupByTone(banners: AppBanner[]): AppBanner[][] {
  const groups: AppBanner[][] = [];
  for (const banner of banners) {
    const last = groups.at(-1);
    if (last && last[0].tone === banner.tone) last.push(banner);
    else groups.push([banner]);
  }
  return groups;
}

// Global slot above every app page: trial, past due, out of credits, plan ended, suspended.
export function AppBanners({ banners: all }: { banners: AppBanner[] }) {
  const pathname = usePathname();
  // The billing page explains a failed payment itself, so the banner would say it twice.
  const banners = all.filter((b) => !(b.kind === "past_due" && b.action?.href === pathname));
  if (banners.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 px-4 pt-4 sm:px-8 sm:pt-6" data-testid="app-banners">
      {groupByTone(banners).map((group) => (
        <div key={group[0].kind} className={cn("flex flex-col divide-y rounded-md border", TONE[group[0].tone].box)}>
          {group.map((banner) => {
            const Icon = banner.kind === "suspended" ? PauseCircle : TONE[banner.tone].icon;
            return (
              <div
                key={banner.kind}
                role={banner.tone === "info" ? "status" : "alert"}
                data-kind={banner.kind}
                className="flex flex-col gap-2 px-3.5 py-2.5 text-sm sm:flex-row sm:items-center"
              >
                <p className="flex flex-1 items-start gap-2">
                  <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{banner.message}</span>
                </p>
                {banner.action && (
                  <Link
                    href={banner.action.href}
                    className="ml-6 shrink-0 font-medium underline underline-offset-4 hover:no-underline sm:ml-0"
                  >
                    {banner.action.label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
