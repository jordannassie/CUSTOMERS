import { Suspense } from "react";
import type { Metadata } from "next";
import { SessionWatcher } from "@/app/_components/session-watcher";
import { TimeZoneCookie } from "@/app/_components/time-zone-cookie";
import { viewerTimeZone } from "@/lib/viewer-time-zone";
import { AppShell } from "@/components/app/AppShell";
import { AppShellSkeleton, PageSkeleton } from "@/components/app/AppShellSkeleton";
import { suggestFeature } from "@/modules/feedback";
import { getScanStatus, scanProblems } from "@/modules/jobs";
import { lastScanNotices } from "@/modules/overview";
import { draftLabel, draftStep, stepPath } from "@/modules/onboarding";
import {
  appAlerts,
  barBanner,
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
  const timeZone = await viewerTimeZone();
  const banners = usage && account ? pickBanners(usage, account, now, timeZone) : [];
  const live = workspace.businesses.filter((b) => b.status !== "onboarding");
  // The bell: the account notices, each business whose newest scan did not run (owner, 2026-11-17), and each whose
  // last scan left an AI unchecked. A failed read is logged and leaves that part out, never the whole app frame.
  const ids = live.map((b) => b.id);
  const [problems, notices] = await Promise.all([
    scanProblems(ids, now).catch((error) => (console.error("[bell] scan alerts failed:", error instanceof Error ? error.message : error), [])),
    lastScanNotices(ids).catch((error) => (console.error("[bell] AI check alerts failed:", error instanceof Error ? error.message : error), [])),
  ]);
  const alerts = appAlerts(banners, problems, Object.fromEntries(live.map((b) => [b.id, b.name])), active.id, now, timeZone, notices);

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
      // One bar at most, for a problem that stops scans; the rest is in the bell (owner, 2026-11-17).
      banners={[barBanner(banners)].filter((b) => b !== null)}
      alerts={alerts}
      testMode={account?.isTest ?? false}
      creditsShort={usage ? shortBalance(usage.balance) : null}
      getScanStatus={getScanStatus}
    >
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </AppShell>
  );
}
