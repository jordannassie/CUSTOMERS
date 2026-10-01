import { Suspense } from "react";
import Link from "next/link";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/modules/auth";
import { getUsageCost, includeTestFilter, PERIODS, periodFilter, type PeriodDays, type UsageCostReport } from "@/modules/admin";
import ByAgency from "./_components/by-agency";
import ByDay from "./_components/by-day";
import { count, money, percent } from "./_components/format";
import MarginCheck from "./_components/margin-check";

export const metadata = { title: "Usage and cost" };

type Props = { searchParams: Promise<{ days?: string | string[]; test?: string | string[] }> };

const BASE = "/internal/admin/usage";

// The admin check runs inside Suspense too: awaiting it at the top would block every period change.
export default function AdminUsagePage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Usage and cost</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Credits customers used, from the credit ledger, against what the AI providers charged us, from the usage log.
        </p>
      </header>
      <Suspense fallback={<UsageSkeleton />}>
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
        <div className="rounded-md border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="text-[15px] font-medium">No credits used and no AI cost in this period</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Pick a longer period, or wait for the next scheduled scans.</p>
        </div>
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
      <nav aria-label="Period">
        <ul className="flex gap-1 rounded-md border border-border bg-muted p-1">
          {PERIODS.map((d) => (
            <li key={d}>
              <Link
                href={href(d, includeTest)}
                aria-current={d === days ? "page" : undefined}
                className={cn(
                  "block rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  d === days ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Last {d} days
              </Link>
            </li>
          ))}
        </ul>
      </nav>
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
    <dl
      aria-label="Totals for the period"
      className="grid grid-cols-2 divide-border rounded-md border border-border bg-surface sm:grid-cols-3 lg:grid-cols-5 lg:divide-x"
    >
      {figures.map((f) => (
        <div key={f.label} data-figure={f.label} className="flex flex-col gap-1 px-5 py-4">
          <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
          <dd className={cn("tabular text-[24px] font-semibold tracking-[-0.02em]", f.bad && "text-low-text")}>{f.value || "-"}</dd>
          {f.note && <dd className="tabular text-[12px] text-text-hint">{f.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

function UsageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading usage and cost">
      <Skeleton className="h-10 w-80 rounded-md" />
      <Skeleton className="h-[104px] rounded-md" />
      <Skeleton className="h-[360px] rounded-md" />
      <Skeleton className="h-[260px] rounded-md" />
    </div>
  );
}
