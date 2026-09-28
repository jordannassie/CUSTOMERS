import { Suspense } from "react";
import type { Metadata } from "next";
import { SessionWatcher } from "@/app/_components/session-watcher";
import { AppShell } from "@/components/app/AppShell";
import { AppShellSkeleton, PageSkeleton } from "@/components/app/AppShellSkeleton";
import {
  BUY_CREDITS_HREF,
  getWorkspace,
  pickBanners,
  shortBalance,
  switchBusiness,
  usageWidget,
} from "@/modules/workspace";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionWatcher />
      <Suspense fallback={<AppShellSkeleton />}>
        <AppFrame>{children}</AppFrame>
      </Suspense>
    </>
  );
}

async function AppFrame({ children }: { children: React.ReactNode }) {
  const workspace = await getWorkspace({ next: "/dashboard" });
  const active = workspace.businesses.find((b) => b.id === workspace.activeBusinessId);
  // Onboarding owns the whole screen until the business is set up.
  if (!active || active.status === "onboarding") return children;

  const now = new Date();
  const { usage, account } = workspace;
  const widget = usage && account ? { ...usageWidget(usage, account, now), buyCreditsHref: BUY_CREDITS_HREF } : null;

  return (
    <AppShell
      businesses={workspace.businesses.map(({ id, name, domain, logoUrl }) => ({ id, name, domain, logoUrl }))}
      activeBusinessId={active.id}
      switchBusiness={switchBusiness}
      usage={widget}
      isAdmin={workspace.isAdmin}
      banners={usage && account ? pickBanners(usage, account, now) : []}
      creditsShort={usage ? shortBalance(usage.balance) : null}
    >
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}
