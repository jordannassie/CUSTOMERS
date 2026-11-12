import { Suspense } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { MonthChange } from "@/modules/admin";
import { Skeleton } from "@/components/ui/skeleton";
import AdminPageHeader from "./_components/page-header";
import { ReportSkeleton } from "./_components/skeletons";
import { StatGrid, StatTile } from "./_components/stat";
import { alertWording, includeTestFilter, isServiceCheckKind, loadLibraryGaps, loadOverview, resolveAlert } from "@/modules/admin";
import { requestNow } from "@/lib/request-now";
import { requireAdmin } from "@/modules/auth";
import { formatDate } from "./_components/format";
import { credits } from "./agencies/_components/agency-parts";
import Sparkline from "./_overview/sparkline";
import { TenSquares, TwoBars } from "@/components/overview/StatVisuals";
import MoneyPanel from "./_overview/money-panel";
import { FailedScans, RecentSignups } from "./_overview/lists";
import OpenAlerts from "./_overview/open-alerts";
import LibraryGaps from "./_overview/library-gaps";

// The admin layout's title template only reaches pages below it, so its own page names the pattern itself.
export const metadata = { title: { absolute: "Overview | Admin" } };

type Props = { searchParams: Promise<{ test?: string | string[] }> };

export default async function AdminOverviewPage({ searchParams }: Props) {
  await requireAdmin({ next: "/internal/admin" });

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Overview({ searchParams }: Props) {
  // "Include test agencies", like Usage and cost: off by default, so the numbers are real customers only (D-61).
  const includeTest = includeTestFilter.parse((await searchParams).test);
  const [o, gaps] = await Promise.all([loadOverview(undefined, undefined, { includeTest }), loadLibraryGaps()]);
  const now = requestNow();
  const alerts = o.openAlerts.map((a) => ({
    ...a,
    ...alertWording(a, now),
    started: formatDate(a.createdAt, true),
    lastSeen: formatDate(a.lastSeenAt, true),
    serviceCheck: isServiceCheckKind(a.kind),
  }));
  const overdue = o.overdueScans
    ? { count: o.overdueScans.count, businesses: o.overdueScans.businesses.map((b) => ({ ...b, due: formatDate(b.dueAt) })) }
    : null;
  return (
    <>
      <AdminPageHeader
        title="Overview"
        subtitle={`This month so far, since ${formatDate(o.monthStart)}. ${includeTest ? "Test agencies are counted." : "Test agencies are not counted."}`}
        actions={
          <Link
            href={includeTest ? "/internal/admin" : "/internal/admin?test=1"}
            className="text-[length:calc(13px*var(--px,1))] font-medium text-primary hover:underline"
            data-testid="overview-include-test"
          >
            {includeTest ? "Leave out test agencies" : "Include test agencies"}
          </Link>
        }
      />

      {/* Problems come first while there are any, as one slim bar; an empty list sits at the bottom. */}
      {(alerts.length > 0 || overdue) && <OpenAlerts rows={alerts} resolve={resolveAlert} overdue={overdue} />}

      <StatGrid>
        {/* Small pictures like the app Overview's (StatVisuals): each draws only the numbers written beside it. */}
        <StatTile
          label="Agencies"
          value={credits(o.agencies)}
          note={<Change change={o.vsLastMonth.agencies} />}
          visual={<TwoBars yours={o.agencies} theirs={o.agenciesAtMonthStart} labels={["Now", "1st"]} />}
        />
        {/* The number is what the bars draw (admin audit 2026-11-12: "0" sat next to a tall bar of trials started). */}
        <StatTile
          label="Trials started this month"
          value={credits(o.vsLastMonth.trialsStarted.thisMonth)}
          note={`${credits(o.vsLastMonth.trialsStarted.lastMonth)} by this day last month. ${credits(o.activeTrials)} on trial now.`}
          visual={<TwoBars yours={o.vsLastMonth.trialsStarted.thisMonth} theirs={o.vsLastMonth.trialsStarted.lastMonth} labels={["This", "Last"]} />}
        />
        {/* The squares sit under the words: beside them, a phone tile broke "businesses" mid-word (admin audit 2026-11-12). */}
        <StatTile
          label="Paying businesses"
          value={credits(o.payingBusinesses)}
          note={`of ${credits(o.businesses)} ${o.businesses === 1 ? "business" : "businesses"}`}
        >
          <span className="inline-flex pt-1">
            <TenSquares named={o.payingBusinesses} answers={o.businesses} />
          </span>
        </StatTile>
        <StatTile label="Credits used" value={credits(o.creditsUsed)} note={<Change change={o.vsLastMonth.credits} />}>
          <Sparkline
            points={o.spark.map((d) => ({ day: d.day, value: d.credits }))}
            label="Credits used per day"
            format={(n) => `${credits(n)} credits`}
          />
        </StatTile>
      </StatGrid>

      <MoneyPanel
        includeTest={includeTest}
        revenue={o.revenue}
        aiCostUsd={o.aiCostUsd}
        revenueChange={o.vsLastMonth.revenue && <Change change={o.vsLastMonth.revenue} />}
        aiCostChange={<Change change={o.vsLastMonth.aiCost} />}
        aiCostSpark={o.spark.map((d) => ({ day: d.day, value: d.costUsd }))}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <RecentSignups rows={o.recentSignups} />
        <FailedScans rows={o.recentFailedScans} includeTest={includeTest} />
      </div>

      <LibraryGaps loaded={gaps.loaded} rows={gaps.gaps} />

      {alerts.length === 0 && !overdue && <OpenAlerts rows={alerts} resolve={resolveAlert} />}
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
