import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/app/PageContainer";
import { Button } from "@/components/ui/button";
import { BalanceSummary } from "@/components/usage/BalanceSummary";
import { Breakdown } from "@/components/usage/Breakdown";
import { ForecastCard } from "@/components/usage/ForecastCard";
import { count, day, monthName } from "@/components/usage/format";
import { ScanHistory } from "@/components/usage/ScanHistory";
import { getUsageReport, type ModelKey } from "@/modules/usage";
import { BILLING_HREF } from "@/modules/workspace";

export const metadata: Metadata = { title: "Usage" };

const MODEL_DOT: Record<ModelKey, string> = {
  openai: "bg-chatgpt",
  anthropic: "bg-claude",
  perplexity: "bg-perplexity",
  unknown: "bg-text-hint",
};

// MVP_SPEC 8.2, D-33: where credits went, what is left, and whether they last to renewal.
export default async function UsagePage() {
  const report = await getUsageReport({ next: "/settings/usage" });
  const { month } = report;

  return (
    <PageContainer>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Usage</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">Where your credits went, what is left, and how long it will last.</p>
        </div>
        <Button asChild>
          <Link href={BILLING_HREF}>Buy credits</Link>
        </Button>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <BalanceSummary balance={report.balance} />
        <ForecastCard forecast={report.forecast} buyCreditsHref={BILLING_HREF} />
      </div>

      <section aria-labelledby="month-heading" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="month-heading" className="text-lg font-semibold tracking-[-0.02em]">
            Used in {monthName(month.startsAt)}
          </h2>
          <p className="text-sm text-muted-foreground">
            <span data-testid="month-used" className="text-[15px] font-semibold text-foreground tabular-nums">
              {count(month.used)}
            </span>{" "}
            {month.used === 1 ? "credit" : "credits"} since {day(month.startsAt)}
          </p>
        </div>
        {month.used === 0 ? (
          <p data-testid="month-empty" className="mt-3 rounded-md border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
            No credits used yet this month. Each scan&apos;s checks will show here by business and by AI model.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <Breakdown
              title="By business"
              testId="by-business"
              total={month.used}
              rows={report.byBusiness.map((b) => ({ key: b.id ?? "deleted", label: b.name, credits: b.credits }))}
            />
            <Breakdown
              title="By AI model"
              testId="by-model"
              total={month.used}
              rows={report.byModel.map((m) => ({ key: m.model, label: m.label, credits: m.credits, dot: MODEL_DOT[m.model] }))}
            />
          </div>
        )}
      </section>

      <div className="mt-10">
        <ScanHistory scans={report.scans} />
      </div>
    </PageContainer>
  );
}
