import { Section, H2, Lead } from "../section";

// MVP_SPEC 4.4 (D-15, D-16): 7 days, card required, 2 businesses, charged on day 7 unless canceled.
const STEPS = [
  {
    when: "Day 1",
    title: "Pick a plan and add your card",
    body: "Nothing is charged today. Add up to 2 businesses and run your first scans.",
  },
  {
    when: "Days 1 to 7",
    title: "Use everything",
    body: "Scans, competitors, fix steps and reports all work during the trial. You can cancel anytime before day 7.",
  },
  {
    when: "Day 7",
    title: "Your plan starts",
    body: "We charge the plan you picked for each business, then again every month on that date. If you canceled, you pay nothing and your results stay readable.",
  },
] as const;

export function TrialTerms() {
  return (
    <Section id="trial" tone="surface">
      <div className="flex flex-col gap-4">
        <H2 className="max-w-[22ch]">7 days free, then your plan starts</H2>
        <Lead>You need a card to start the trial. You are only charged if you keep going past day 7.</Lead>
      </div>

      <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
        {STEPS.map(({ when, title, body }) => (
          <li key={when} className="flex flex-col gap-3 border-t-2 border-border pt-5 last:border-primary">
            <span className="tabular text-[13px] font-medium text-text-hint">{when}</span>
            <h3 className="text-xl font-semibold tracking-[-0.02em]">{title}</h3>
            <p className="text-[15px] text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
