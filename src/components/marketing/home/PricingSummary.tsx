import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCount, formatUsd, type PublicPlan } from "@/modules/billing/format";
import { Section, Eyebrow, H2, Lead } from "../section";

const FACTS = [
  {
    title: "Credits included",
    body: "One question sent to one AI uses one credit. Every business adds its monthly credits to one shared pool.",
  },
  {
    title: "7-day free trial",
    body: "Add up to 2 businesses. A card is needed to start, and you are charged on day 7 unless you cancel.",
  },
] as const;

/** Plan rows come from the plans table (D-58) through the page, so this matches /pricing. */
export function PricingSummary({ plans }: { plans: PublicPlan[] }) {
  return (
    <Section id="pricing" tone="surface">
      <div className="flex flex-col gap-4">
        <Eyebrow>Pricing</Eyebrow>
        <H2 className="max-w-[20ch]">One price per business, with credits included</H2>
        <Lead>Pay for each business you track, and cancel anytime. Agencies can mix plans.</Lead>
      </div>

      <dl className="mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
        {plans.map((plan) => (
          <div key={plan.id} data-plan-id={plan.id} className="flex flex-col gap-2 border-t-2 border-primary pt-5">
            <dt className="text-lg font-semibold tracking-[-0.02em]">{plan.name}</dt>
            <dd className="flex flex-col gap-1">
              <span className="text-[15px] text-muted-foreground">
                <span data-testid="plan-price" className="tabular text-2xl font-semibold tracking-[-0.02em] text-foreground">
                  {formatUsd(plan.priceCents)}
                </span>{" "}
                per business a month
              </span>
              <span className="text-[15px] text-muted-foreground">
                <span data-testid="plan-credits" className="tabular">{formatCount(plan.monthlyCredits)}</span> credits a month
              </span>
            </dd>
          </div>
        ))}
        {FACTS.map(({ title, body }) => (
          <div key={title} className="flex flex-col gap-2 border-t border-border pt-5">
            <dt className="text-lg font-semibold tracking-[-0.02em]">{title}</dt>
            <dd className="text-[15px] text-muted-foreground">{body}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/pricing">See plans and prices</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/signup">Start free trial</Link>
        </Button>
      </div>
    </Section>
  );
}
