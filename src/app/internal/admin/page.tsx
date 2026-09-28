import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { loadOverview } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import { formatDate } from "./businesses/_components/scan-parts";
import { credits } from "./agencies/_components/agency-parts";
import MoneyPanel from "./_overview/money-panel";
import { FailedScans, OpenAlerts, RecentSignups } from "./_overview/lists";

export const metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  await requireAdmin({ next: "/internal/admin" });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>
    </div>
  );
}

async function Overview() {
  const o = await loadOverview();
  return (
    <>
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Overview</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          This month so far, since {formatDate(o.monthStart)}. Test agencies are not counted.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        <Stat label="Agencies" value={o.agencies} />
        <Stat label="Active trials" value={o.activeTrials} />
        <Stat label="Paying businesses" value={o.payingBusinesses} />
        <Stat label="Credits used" value={o.creditsUsed} />
      </dl>

      <MoneyPanel revenue={o.revenue} aiCostUsd={o.aiCostUsd} />

      <div className="grid gap-8 lg:grid-cols-2">
        <RecentSignups rows={o.recentSignups} />
        <FailedScans rows={o.recentFailedScans} />
      </div>

      <OpenAlerts rows={o.openAlerts} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 bg-surface px-4 py-4">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{credits(value)}</dd>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading overview">
      <Skeleton className="h-12 w-80" />
      <Skeleton className="h-24 rounded-md" />
      <Skeleton className="h-40 rounded-md" />
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
    </div>
  );
}
