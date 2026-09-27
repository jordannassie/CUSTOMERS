import { cn } from "cn";
import type { UsageReport } from "@/modules/usage";
import { count, credits } from "./format";

// Plan and top-up credits as one bar: plan credits are spent first because they expire (MVP_SPEC 4.2).
export function BalanceSummary({ balance }: { balance: UsageReport["balance"] }) {
  const over = balance.total < 0;
  const pool = balance.plan + balance.topup;
  const planShare = pool > 0 ? (balance.plan / pool) * 100 : 0;

  return (
    <section aria-labelledby="balance-heading" className="rounded-md border border-border bg-surface p-5">
      <h2 id="balance-heading" className="text-sm font-medium text-muted-foreground">
        Credits left
      </h2>
      <p
        data-testid="balance-total"
        className={cn("mt-1 text-[32px] font-semibold leading-tight tracking-[-0.02em] tabular-nums", over && "text-low-text")}
      >
        {over ? `${count(-balance.total)} over` : count(balance.total)}
      </p>

      {pool > 0 && (
        <div className="mt-4 flex h-2 overflow-hidden rounded-[2px] bg-muted" aria-hidden>
          <div className="bg-primary" style={{ width: `${planShare}%` }} />
          <div className="bg-primary/35" style={{ width: `${100 - planShare}%` }} />
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Line label="Plan credits" value={balance.plan} swatch="bg-primary" testId="balance-plan" />
        <Line label="Top-up credits" value={balance.topup} swatch="bg-primary/35" testId="balance-topup" />
        {balance.held > 0 && <Line label="Held for running scans" value={balance.held} />}
        {balance.overdraft > 0 && <Line label="Used past zero" value={balance.overdraft} />}
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Plan credits are used first and reset at renewal. Top-up credits never expire.
      </p>
      {over && (
        <p className="mt-2 text-xs font-medium text-low-text">
          Your next top-up or renewal pays back the {credits(-balance.total)} first.
        </p>
      )}
    </section>
  );
}

function Line({ label, value, swatch, testId }: { label: string; value: number; swatch?: string; testId?: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {swatch && <span aria-hidden className={cn("size-2 rounded-full", swatch)} />}
        {label}
      </dt>
      <dd data-testid={testId} className="mt-0.5 font-medium tabular-nums">
        {count(value)}
      </dd>
    </div>
  );
}
