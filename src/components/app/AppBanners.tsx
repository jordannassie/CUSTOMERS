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
  danger: { box: "border-low/30 bg-low-bg text-low-text", icon: AlertTriangle },
  warning: { box: "border-mid/30 bg-mid-bg text-mid-text", icon: AlertTriangle },
  info: { box: "border-primary/20 bg-primary-tint text-primary-hover", icon: Info },
};

// Global slot above every app page: trial, past due, out of credits, plan ended, suspended.
export function AppBanners({ banners: all }: { banners: AppBanner[] }) {
  const pathname = usePathname();
  // The billing page explains a failed payment itself, so the banner would say it twice.
  const banners = all.filter((b) => !(b.kind === "past_due" && b.action?.href === pathname));
  if (banners.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 px-4 pt-4 sm:px-8 sm:pt-6" data-testid="app-banners">
      {banners.map((banner) => {
        const Icon = banner.kind === "suspended" ? PauseCircle : TONE[banner.tone].icon;
        return (
          <div
            key={banner.kind}
            role={banner.tone === "info" ? "status" : "alert"}
            data-kind={banner.kind}
            className={cn("flex flex-col gap-2 rounded-md border px-3.5 py-2.5 text-sm sm:flex-row sm:items-center", TONE[banner.tone].box)}
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
  );
}
