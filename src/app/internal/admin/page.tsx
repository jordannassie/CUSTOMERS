import { Suspense } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { MonthChange } from "@/modules/admin";
import { Skeleton } from "@/components/ui/skeleton";
import AdminPageHeader from "./_components/page-header";
import { ReportSkeleton } from "./_components/skeletons";
import { StatGrid, StatTile } from "./_components/stat";
import { alertWording, isServiceCheckKind, loadLibraryGaps, loadOverview, resolveAlert } from "@/modules/admin";
import { requestNow } from "@/lib/request-now";
import { requireAdmin } from "@/modules/auth";
import { formatDate } from "./_components/format";
import { credits } from "./agencies/_components/agency-parts";
import Sparkline from "./_overview/sparkline";
import MoneyPanel from "./_overview/money-panel";
import { FailedScans, RecentSignups } from "./_overview/lists";
import OpenAlerts from "./_overview/open-alerts";
import LibraryGaps from "./_overview/library-gaps";

// The admin layout's title template only reaches pages below it, so its own page names the pattern itself.
export const metadata = { title: { absolute: "Overview | Admin" } };

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
  const [o, gaps] = await Promise.all([loadOverview(), loadLibraryGaps()]);
  const now = requestNow();
  const alerts = o.openAlerts.map((a) => ({
    ...a,
    ...alertWording(a, now),
    started: formatDate(a.createdAt, true),
    lastSeen: formatDate(a.lastSeenAt, true),
    serviceCheck: isServiceCheckKind(a.kind),
  }));
  return (
    <>
      <AdminPageHeader title="Overview" subtitle={`This month so far, since ${formatDate(o.monthStart)}. Test agencies are not counted.`} />

      {/* Problems come first while there are any; an empty list sits at the bottom. */}
      {alerts.length > 0 && <OpenAlerts rows={alerts} resolve={resolveAlert} />}

      <StatGrid>
        <StatTile label="Agencies" value={credits(o.agencies)} note={<Change change={o.vsLastMonth.agencies} />} />
        <StatTile
          label="Active trials"
          value={credits(o.activeTrials)}
          note={`${o.vsLastMonth.trialsStarted.thisMonth} started this month, ${o.vsLastMonth.trialsStarted.lastMonth} by this day last month`}
        />
        <StatTile label="Paying businesses" value={credits(o.payingBusinesses)} />
        <StatTile label="Credits used" value={credits(o.creditsUsed)} note={<Change change={o.vsLastMonth.credits} />}>
          <Sparkline
            points={o.spark.map((d) => ({ day: d.day, value: d.credits }))}
            label="Credits used per day"
            format={(n) => `${credits(n)} credits`}
          />
        </StatTile>
      </StatGrid>

      <MoneyPanel
        revenue={o.revenue}
        aiCostUsd={o.aiCostUsd}
        revenueChange={o.vsLastMonth.revenue && <Change change={o.vsLastMonth.revenue} />}
        aiCostChange={<Change change={o.vsLastMonth.aiCost} />}
        aiCostSpark={o.spark.map((d) => ({ day: d.day, value: d.costUsd }))}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <RecentSignups rows={o.recentSignups} />
        <FailedScans rows={o.recentFailedScans} />
      </div>

      <LibraryGaps loaded={gaps.loaded} rows={gaps.gaps} />

      {alerts.length === 0 && <OpenAlerts rows={alerts} resolve={resolveAlert} />}
    </>
  );
}

/** Grey, not green or red: more credits used is good news, more AI cost is not. */
export function Change({ change }: { change: MonthChange }) {
  return (
    <span className="inline-flex items-center gap-1" data-testid="month-change">
      {change.direction === "up" && <ArrowUp className="size-3.5 shrink-0" aria-hidden="true" />}
      {change.direction === "down" && <ArrowDown className="size-3.5 shrink-0" aria-hidden="true" />}
      {change.text}
    </span>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <ReportSkeleton label="Loading overview" />
    </div>
  );
}
