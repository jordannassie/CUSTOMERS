import { Suspense } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { requireAdmin } from "@/modules/auth";
import { getUsageCost, includeTestFilter, PERIODS, periodFilter, type PeriodDays, type UsageCostReport } from "@/modules/admin";
import ByAgency from "./_components/by-agency";
import ByDay from "./_components/by-day";
import { count, money, percent } from "./_components/format";
import MarginCheck from "./_components/margin-check";
import AdminEmpty from "../_components/admin-empty";
import FilterTabs from "../_components/filter-tabs";
import AdminPageHeader from "../_components/page-header";
import { ReportSkeleton } from "../_components/skeletons";
import { StatGrid, StatTile } from "../_components/stat";

export const metadata = { title: "Usage and cost" };

type Props = { searchParams: Promise<{ days?: string | string[]; test?: string | string[] }> };

const BASE = "/internal/admin/usage";

// The admin check runs inside Suspense too: awaiting it at the top would block every period change.
export default function AdminUsagePage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminPageHeader
        title="Usage and cost"
        subtitle="Credits customers used, from the credit ledger, against what the AI providers charged us, from the usage log."
      />
      <Suspense fallback={<ReportSkeleton label="Loading usage and cost" />}>
        <LiveUsage searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LiveUsage({ searchParams }: Props) {
  await requireAdmin({ next: BASE });
  const params = await searchParams;
  const days = periodFilter.parse(params.days);
  const includeTest = includeTestFilter.parse(params.test);
  const report = await getUsageCost({ days, includeTest });
  const empty = report.totals.credits === 0 && report.totals.costUsd === 0;

  return (
    <div className="flex flex-col gap-6">
      <Filters days={days} includeTest={includeTest} />
      <Summary report={report} />
      {empty ? (
        <AdminEmpty icon={Coins} title="No credits used and no AI cost in this period">
          Pick a longer period, or wait for the next scheduled scans.
        </AdminEmpty>
      ) : (
        <>
          <MarginCheck models={report.byModel} creditPrice={report.creditPriceUsd} otherCost={report.otherCostUsd} />
          <ByDay days={report.byDay} />
          <ByAgency agencies={report.byAgency} />
        </>
      )}
    </div>
  );
}

function href(days: PeriodDays, includeTest: boolean) {
  const params = new URLSearchParams({ days: String(days) });
  if (includeTest) params.set("test", "1");
  return `${BASE}?${params}`;
}

function Filters({ days, includeTest }: { days: PeriodDays; includeTest: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <FilterTabs
        label="Period"
        active={String(days)}
        tabs={PERIODS.map((d) => ({ key: String(d), label: d === "month" ? "This month" : `Last ${d} days`, href: href(d, includeTest) }))}
      />
      <Link href={href(days, !includeTest)} className="text-[13px] font-medium text-primary hover:underline">
        {includeTest ? "Leave out test agencies" : "Include test agencies"}
      </Link>
    </div>
  );
}

function Summary({ report }: { report: UsageCostReport }) {
  const { totals, creditPriceUsd } = report;
  const figures = [
    { label: "Credits used", value: count(totals.credits) },
    { label: "Real AI cost", value: money(totals.costUsd) },
    { label: "Credits worth at least", value: creditPriceUsd === null ? "" : money(totals.credits * creditPriceUsd) },
    { label: "Margin", value: percent(totals.margin), bad: totals.margin !== null && totals.margin < 0 },
    { label: "Answered from cache", value: percent(totals.cacheHitRate), note: `${count(totals.cached)} of ${count(totals.checks)} checks` },
  ];

  return (
    <StatGrid label="Totals for the period" columns={5}>
      {figures.map((f) => (
        <StatTile key={f.label} label={f.label} value={f.value || "-"} note={f.note} tone={f.bad ? "bad" : undefined} />
      ))}
    </StatGrid>
  );
}
