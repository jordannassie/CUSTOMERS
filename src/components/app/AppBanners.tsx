"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Info,
  PauseCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { noticeKey, useHiddenNotices } from "./hide-notice";
import { HideButton } from "./HideableNotice";

export type AppBanner = {
  kind:
    | "test_mode"
    | "suspended"
    | "past_due"
    | "out_of_credits"
    | "low_credits"
    | "trial"
    | "ended";
  tone: "danger" | "warning" | "info";
  message: string;
  action: { label: string; href: string } | null;
};

const TONE: Record<AppBanner["tone"], { box: string; icon: LucideIcon }> = {
  danger: {
    box: "divide-low/30 border-low/30 bg-low-bg text-low-text",
    icon: AlertTriangle,
  },
  warning: {
    box: "divide-mid/30 border-mid/30 bg-mid-bg text-mid-text",
    icon: AlertTriangle,
  },
  info: {
    box: "divide-primary/20 border-primary/20 bg-primary-tint text-primary-hover",
    icon: Info,
  },
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

// Pages laid out wider than the usual 1200px (PageContainer `wide`), so the banners line up with their content.
const WIDE_PAGES = ["/actions"];

// Global slot above every app page: trial, past due, out of credits, plan ended, suspended. Each has an × that hides
// it for 15 minutes in this browser (hide-notice.ts).
export function AppBanners({ banners: all }: { banners: AppBanner[] }) {
  const pathname = usePathname();
  const keyOf = (b: AppBanner) => noticeKey(`banner-${b.kind}`, b.message);
  const { hidden, hide } = useHiddenNotices(all.map(keyOf));
  // The billing page explains a failed payment itself, so the banner would say it twice.
  const banners = all.filter(
    (b) =>
      !(b.kind === "past_due" && b.action?.href === pathname) &&
      !hidden.has(keyOf(b)),
  );
  if (banners.length === 0) return null;
  const wide = WIDE_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-2 px-4 pt-3 sm:px-6 sm:pt-4",
        wide ? "max-w-[calc(1440px*var(--px,1))]" : "max-w-[calc(1200px*var(--px,1))]",
      )}
      data-testid="app-banners"
    >
      {groupByTone(banners).map((group) => (
        <div
          key={group[0].kind}
          className={cn(
            "flex flex-col divide-y rounded-md border",
            TONE[group[0].tone].box,
          )}
        >
          {group.map((banner) => {
            const Icon =
              banner.kind === "suspended"
                ? PauseCircle
                : TONE[banner.tone].icon;
            return (
              <div
                key={banner.kind}
                role={banner.tone === "info" ? "status" : "alert"}
                data-kind={banner.kind}
                className="flex items-start gap-2 py-1.5 pr-1.5 pl-3 text-[length:calc(13px*var(--px,1))] sm:items-center"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5 sm:flex-row sm:items-center">
                  <p className="flex flex-1 items-start gap-2">
                    <Icon
                      className="mt-px size-4 shrink-0"
                      aria-hidden="true"
                    />
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
                <HideButton onClick={() => hide(keyOf(banner))} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
