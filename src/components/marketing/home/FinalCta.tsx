import { Section, CTA } from "../section";

export function FinalCta() {
  return (
    <Section aria-label="Get started">
      <CTA
        title="Find out if AI recommends your business"
        description="Start a 7-day trial and see your first results today, or compare your website with a competitor's for free."
        primary={{ label: "Start free trial", href: "/signup" }}
        secondary={{ label: "Compare free", href: "/compare" }}
      />
    </Section>
  );
}
