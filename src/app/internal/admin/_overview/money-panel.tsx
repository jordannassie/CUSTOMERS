import Link from "next/link";
import { aiCostShare, type Revenue } from "@/modules/admin";
import { usd } from "../agencies/_components/agency-parts";

/** Revenue and real AI cost side by side, with the cost drawn as a share of what customers paid. */
export default function MoneyPanel({ revenue, aiCostUsd }: { revenue: Revenue; aiCostUsd: number }) {
  const share = aiCostShare(aiCostUsd, revenue);
  const revenueUsd = revenue.state === "ok" ? revenue.cents / 100 : null;

  return (
    <section aria-labelledby="money-heading" className="rounded-md border border-border bg-surface">
      <h2 id="money-heading" className="sr-only">
        Revenue and AI cost
      </h2>
      <div className="grid gap-px bg-border sm:grid-cols-2">
        <div className="flex flex-col gap-1 bg-surface px-5 py-5">
          <p className="text-[13px] text-muted-foreground">Revenue this month, from Stripe</p>
          {revenueUsd !== null ? (
            <p className="text-[32px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{usd(revenueUsd)}</p>
          ) : (
            <p className="text-[20px] font-semibold text-muted-foreground">
              {revenue.state === "error" ? "Could not reach Stripe" : "Stripe not connected"}
            </p>
          )}
          <p className="text-[13px] text-text-hint">
            {revenue.state === "ok"
              ? revenue.mode === "fixture"
                ? "Test mode: no real Stripe account is used."
                : "Payments collected, after refunds."
              : revenue.state === "error"
                ? "Refresh in a minute. The rest of this page is still correct."
                : "Revenue shows here once a Stripe key is set."}
          </p>
        </div>
        <div className="flex flex-col gap-1 bg-surface px-5 py-5">
          <p className="text-[13px] text-muted-foreground">Real AI cost this month</p>
          <p className="text-[32px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{usd(aiCostUsd)}</p>
          <p className="text-[13px] text-text-hint">
            What OpenAI, Anthropic and Perplexity charged us.{" "}
            <Link href="/internal/admin/usage" className="text-primary hover:underline">
              See by model
            </Link>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
        <div
          role="img"
          aria-label={share === null ? "No revenue to compare with yet" : `AI cost is ${Math.round(share * 100)}% of revenue`}
          className="h-3 overflow-hidden rounded-sm bg-good-bg"
        >
          {share !== null && (
            <div
              className={share >= 1 ? "h-full bg-low" : share >= 0.5 ? "h-full bg-mid" : "h-full bg-primary"}
              style={{ width: `${Math.min(share, 1) * 100}%` }}
            />
          )}
        </div>
        <p className="text-[14px]">
          {share === null
            ? "No revenue to compare with yet, so there is no margin to show."
            : share >= 1
              ? `AI costs more than we take in: ${usd(aiCostUsd)} against ${usd(revenueUsd!)}.`
              : `AI costs ${Math.round(share * 100)} cents of every dollar customers pay.`}
        </p>
      </div>
    </section>
  );
}
