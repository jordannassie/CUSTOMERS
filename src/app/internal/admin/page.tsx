import { Suspense } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { MonthChange } from "@/modules/admin";
import { Skeleton } from "@/components/ui/skeleton";
import { loadOverview, resolveAlert } from "@/modules/admin";
import { requireAdmin } from "@/modules/auth";
import { formatDate } from "./businesses/_components/scan-parts";
import { credits } from "./agencies/_components/agency-parts";
import Sparkline from "./_overview/sparkline";
import MoneyPanel from "./_overview/money-panel";
import { FailedScans, RecentSignups } from "./_overview/lists";
import OpenAlerts from "./_overview/open-alerts";

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
  const o = await loadOverview();
  const alerts = o.openAlerts.map((a) => ({ ...a, started: formatDate(a.createdAt, true), lastSeen: formatDate(a.lastSeenAt, true) }));
  return (
    <>
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Overview</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          This month so far, since {formatDate(o.monthStart)}. Test agencies are not counted.
        </p>
      </header>

      {/* Problems come first while there are any; an empty list sits at the bottom. */}
      {alerts.length > 0 && <OpenAlerts rows={alerts} resolve={resolveAlert} />}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        <Stat label="Agencies" value={o.agencies} note={<Change change={o.vsLastMonth.agencies} />} />
        <Stat
          label="Active trials"
          value={o.activeTrials}
          note={`${o.vsLastMonth.trialsStarted.thisMonth} started this month, ${o.vsLastMonth.trialsStarted.lastMonth} by this day last month`}
        />
        <Stat label="Paying businesses" value={o.payingBusinesses} />
        <Stat
          label="Credits used"
          value={o.creditsUsed}
          note={<Change change={o.vsLastMonth.credits} />}
          spark={
            <Sparkline
              points={o.spark.map((d) => ({ day: d.day, value: d.credits }))}
              label="Credits used per day"
              format={(n) => `${credits(n)} credits`}
            />
          }
        />
      </dl>

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

      {alerts.length === 0 && <OpenAlerts rows={alerts} resolve={resolveAlert} />}
    </>
  );
}

function Stat({ label, value, note, spark }: { label: string; value: number; note?: React.ReactNode; spark?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 bg-surface px-4 py-4">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="flex flex-col gap-1.5">
        <span className="text-[32px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{credits(value)}</span>
        {note && <span className="text-[13px] text-text-hint tabular-nums">{note}</span>}
        {spark}
      </dd>
    </div>
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
