import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCount, formatUsd, type PublicPlan } from "@/modules/billing/format";

function limits(plan: PublicPlan): string[] {
  return [
    plan.maxQuestions ? `Up to ${plan.maxQuestions} customer questions per business` : null,
    plan.maxCompetitors ? `Up to ${plan.maxCompetitors} competitors per business` : null,
    "ChatGPT, Claude and Perplexity, all with web search",
    "Fix steps, PDF reports and share links",
  ].filter((line): line is string => line !== null);
}

function limitChange(now: number | null, before: number | null, what: string, prevName: string): string | null {
  if (now === before) return null;
  if (!now) return `No limit on ${what}`;
  return `Up to ${now} ${what} per business${before ? ` (${before} on ${prevName})` : ""}`;
}

/** Only what a plan adds over the one before it, so the real differences stand out (DB-007). */
function additions(plan: PublicPlan, prev: PublicPlan): string[] {
  return [
    limitChange(plan.maxCompetitors, prev.maxCompetitors, "competitors", prev.name),
    limitChange(plan.maxQuestions, prev.maxQuestions, "customer questions", prev.name),
    plan.monthlyCredits !== prev.monthlyCredits
      ? `${formatCount(plan.monthlyCredits)} credits each month (${formatCount(prev.monthlyCredits)} on ${prev.name})`
      : null,
  ].filter((line): line is string => line !== null);
}

/** When the top plan is worth it, built from the same rows as the cards. */
function whenToPickTop(plans: PublicPlan[]): string | null {
  if (plans.length < 2) return null;
  const top = plans[plans.length - 1];
  const prev = plans[plans.length - 2];
  const reasons = [
    top.maxCompetitors && top.maxCompetitors !== prev.maxCompetitors ? `compare up to ${top.maxCompetitors} competitors` : null,
    top.monthlyCredits > prev.monthlyCredits ? "check more questions every day" : null,
  ].filter((reason): reason is string => reason !== null);
  return reasons.length > 0 ? `Pick ${top.name} to ${reasons.join(" or to ")}.` : null;
}

export function PlanCards({ plans }: { plans: PublicPlan[] }) {
  if (plans.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface p-6 sm:p-8">
        <p className="text-lg font-semibold">Prices are being updated</p>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Check back in a few minutes, or <Link href="/contact" className="text-primary underline-offset-4 hover:underline">send us a message</Link> and
          we will tell you the current prices.
        </p>
      </div>
    );
  }

  const pickTop = whenToPickTop(plans);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan, i) => {
          const prev = i > 0 ? plans[i - 1] : null;
          return (
            <article
              key={plan.id}
              data-plan-id={plan.id}
              aria-labelledby={`plan-${plan.id}`}
              className="flex flex-col rounded-md border border-border bg-surface p-6 sm:p-8"
            >
              <h2 id={`plan-${plan.id}`} className="text-xl font-semibold tracking-[-0.02em]">
                {plan.name}
              </h2>
              <p className="mt-5 flex items-baseline gap-2">
                <span data-testid="plan-price" className="tabular text-5xl font-semibold tracking-[-0.035em]">
                  {formatUsd(plan.priceCents)}
                </span>
                <span className="text-[15px] text-muted-foreground">per business a month</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span data-testid="plan-credits" className="tabular font-medium text-foreground">
                  {formatCount(plan.monthlyCredits)}
                </span>{" "}
                credits included each month
              </p>

              <div className="mt-6 flex flex-1 flex-col gap-3 border-t border-border pt-6 text-[15px]">
                {prev && <p className="font-medium">Everything in {prev.name}, plus</p>}
                <ul className="flex flex-col gap-3">
                  {(prev ? additions(plan, prev) : limits(plan)).map((line) => (
                    <li key={line} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="tabular">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button asChild size="lg" variant={plan === plans[plans.length - 1] ? "default" : "outline"} className="mt-8 w-full">
                <Link href={`/signup?plan=${encodeURIComponent(plan.id)}`}>Choose {plan.name}</Link>
              </Button>
              <p className="mt-3 text-center text-[13px] text-text-hint">7-day free trial, card needed to start</p>
            </article>
          );
        })}
      </div>
      {pickTop && <p className="text-[15px] font-medium">{pickTop}</p>}
    </div>
  );
}
