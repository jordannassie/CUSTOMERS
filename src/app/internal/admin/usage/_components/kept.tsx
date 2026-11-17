import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import type { Kept, ServiceCost } from "@/modules/admin";
import { money, percent, plural } from "./format";

const NO_STRIPE: Record<Exclude<Kept["state"], "ok">, string> = {
  not_connected: "Stripe is not connected, so the money collected can't be shown. The costs below are still counted.",
  fixture: "Stripe runs in test mode here, with no real payments, so the money collected can't be shown. The costs below are still counted.",
  error: "Stripe could not be reached just now, so the money collected can't be shown. The costs below are still counted.",
};

/**
 * What we keep in the period (owner, 2026-11-17): the money Stripe collected, then every cost we pay per use, as one
 * short statement in the same card style as "Is each model still profitable?". Red only when we lose money.
 */
export default function KeptCard({ kept, services }: { kept: Kept; services: ServiceCost[] }) {
  const ok = kept.state === "ok";
  const losing = ok && kept.keptUsd < 0;

  return (
    <section aria-labelledby="kept-heading" className="rounded-md border border-border bg-surface" data-testid="kept">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 id="kept-heading" className="text-[length:calc(16px*var(--px,1))] font-semibold">
            What we keep
          </h2>
          <p className="mt-1 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
            The money customers paid in this period, less everything we pay per use: Stripe&apos;s fees, the AI tools and the other
            services.
          </p>
        </div>
        {ok && kept.margin !== null && (
          <Badge variant={losing ? "mid" : "secondary"} data-testid="kept-margin">
            {losing ? "Losing money" : `${percent(kept.margin)} kept`}
          </Badge>
        )}
      </header>

      {!ok && <p className="border-b border-border bg-muted/40 px-5 py-3 text-[length:calc(13px*var(--px,1))] text-muted-foreground">{NO_STRIPE[kept.state]}</p>}

      <dl className="divide-y divide-border text-[length:calc(13.5px*var(--px,1))]">
        {ok && (
          <Line
            label="Collected from customers"
            note={kept.charges > 0 ? `${plural(kept.charges, "payment", "payments")} through Stripe, after refunds` : "No payments in this period"}
            value={money(kept.collectedUsd)}
          />
        )}
        {ok && <Line label="Stripe fees" note="What Stripe kept for processing those payments" value={minus(kept.stripeFeesUsd)} />}
        <Line label="AI tools" note="ChatGPT, Claude and Perplexity checks, and the AI work behind explanations and setup" value={minus(kept.aiCostUsd)} />
        {services.map((s) => (
          <Line
            key={s.key}
            label={s.label}
            note={
              s.calls === 0
                ? "Not used in this period"
                : s.key === "firecrawl"
                  ? `${plural(s.calls, "page", "pages")} read, 1 credit each at your plan's price`
                  : `${plural(s.calls, "call", "calls")}, at Google's list price`
            }
            value={minus(s.costUsd)}
          />
        ))}
        <div className="flex items-baseline justify-between gap-4 bg-muted/40 px-5 py-3.5">
          <dt className="font-semibold">{ok ? "What we keep" : "Costs in this period"}</dt>
          <dd className={cn("tabular text-[length:calc(18px*var(--px,1))] font-semibold tracking-[-0.01em]", losing && "text-mid-text")} data-testid="kept-total">
            {ok ? money(kept.keptUsd) : money(kept.aiCostUsd + kept.servicesUsd)}
          </dd>
        </div>
      </dl>

      <p className="border-t border-border px-5 py-3 text-[length:calc(12.5px*var(--px,1))] text-muted-foreground">
        Google is counted at list price: its free calls each month (1,000 to 10,000 per kind of call) are not taken off, so its real
        bill can be lower. Monthly plans that don&apos;t grow with use (hosting, database, email) are not in this card. Payments come in
        when customers buy, and credits are used over time, so a short period can look better or worse than it is.
      </p>
    </section>
  );
}

// A cost, as a deduction: "-$12.40". toLocaleString gives "-$" for negatives, the same style.
const minus = (usd: number) => (usd > 0 ? money(-usd) : money(0));

function Line({ label, note, value }: { label: string; note: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <div className="min-w-0">
        <dt className="font-medium">{label}</dt>
        <p className="mt-0.5 text-[length:calc(12.5px*var(--px,1))] text-muted-foreground">{note}</p>
      </div>
      <dd className="tabular shrink-0 font-medium">{value}</dd>
    </div>
  );
}

