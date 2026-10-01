import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCount, formatUsd, type PublicPlan } from "@/modules/billing/format";
import { Section, Eyebrow, H2 } from "../section";

const POINTS = [
  "Each client business has its own plan. Put some on Starter and others on Pro.",
  "Every business adds its monthly credits to one shared pool, so a busy client can use what a quiet one does not.",
  "One renewal date and one invoice for all your clients.",
  "Try it with 2 clients for 7 days. A card is needed to start.",
];

export function AgencyBilling({ plans }: { plans: PublicPlan[] }) {
  return (
    <Section id="billing" tone="muted">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-4">
          <Eyebrow>Billing</Eyebrow>
          <H2 className="max-w-[18ch]">You pay per client business</H2>
          <ul className="mt-2 flex flex-col gap-3 text-[15px] text-muted-foreground">
            {POINTS.map((p) => (
              <li key={p} className="border-l-2 border-primary pl-4">
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-6 md:pt-2">
          {plans.length > 0 && (
            <dl className="rounded-md border border-border bg-surface">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  data-plan-id={plan.id}
                  className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0"
                >
                  <dt className="font-semibold">{plan.name}</dt>
                  <dd className="text-right text-[15px] text-muted-foreground">
                    <span data-testid="plan-price" className="tabular font-semibold text-foreground">
                      {formatUsd(plan.priceCents)}
                    </span>{" "}
                    per business a month, {formatCount(plan.monthlyCredits)} credits
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg">
              <Link href="/pricing">See full pricing</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact?interest=agency">Ask about a custom plan</Link>
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}
