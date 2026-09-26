import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, Eyebrow, H2, Lead } from "../section";

// Prices and credit amounts live in the plans table (D-58), which is not built yet (B-11),
// so this section explains how pricing works and leaves the numbers to /pricing.
const FACTS = [
  {
    title: "Priced per business",
    body: "Pick Starter or Pro for each business you track, billed monthly. Agencies can mix plans.",
  },
  {
    title: "Credits included",
    body: "One question sent to one AI uses one credit. Every business adds its monthly credits to one shared pool.",
  },
  {
    title: "7-day free trial",
    body: "Add up to 2 businesses. A card is needed to start, and you are charged on day 7 unless you cancel.",
  },
] as const;

export function PricingSummary() {
  return (
    <Section id="pricing" tone="surface">
      <div className="flex flex-col gap-4">
        <Eyebrow>Pricing</Eyebrow>
        <H2 className="max-w-[20ch]">Simple pricing that grows with you</H2>
        <Lead>Pay for the businesses you track, and cancel anytime.</Lead>
      </div>

      <dl className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
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
