import { Suspense } from "react";
import type { Metadata } from "next";
import { SessionWatcher } from "@/app/_components/session-watcher";
import { TimeZoneCookie } from "@/app/_components/time-zone-cookie";
import { viewerTimeZone } from "@/lib/viewer-time-zone";
import { AppShell } from "@/components/app/AppShell";
import { AppShellSkeleton, PageSkeleton } from "@/components/app/AppShellSkeleton";
import { suggestFeature } from "@/modules/feedback";
import { draftLabel, draftStep, stepPath } from "@/modules/onboarding";
import {
  BUY_CREDITS_HREF,
  getWorkspace,
  pickBanners,
  shortBalance,
  switchBusiness,
  switcherScores,
  usageWidget,
} from "@/modules/workspace";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SessionWatcher />
      <TimeZoneCookie />
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
  // An unfinished draft is never lost: the switcher links back to the step where it stopped.
  const draft = workspace.businesses.find((b) => b.status === "onboarding");
  const widget = usage && account ? { ...usageWidget(usage, account, now), buyCreditsHref: BUY_CREDITS_HREF } : null;

  return (
    <AppShell
      // Unfinished drafts stay out of the switcher's list; the one being set up is named on its own (BUG-092).
      businesses={workspace.businesses
        .filter((b) => b.status !== "onboarding")
        .map(({ id, name, domain, logoUrl }) => ({ id, name, domain, logoUrl }))}
      setupName={draft?.name ?? null}
      draft={draft ? { label: draftLabel(draft), href: stepPath(draftStep(draft.onboardingStep)) } : null}
      activeBusinessId={active.id}
      switchBusiness={switchBusiness}
      suggestFeature={suggestFeature}
      switcherScores={switcherScores}
      usage={widget}
      isAdmin={workspace.isAdmin}
      banners={usage && account ? pickBanners(usage, account, now, await viewerTimeZone()) : []}
      creditsShort={usage ? shortBalance(usage.balance) : null}
    >
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}
