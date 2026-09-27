import { Section, CTA } from "../section";

export function FinalCta() {
  return (
    <Section aria-label="Get started">
      <CTA
        title="Find out if AI recommends your business"
        description="Start a 7-day trial and see your first results today, or check for free how easy your website is for AI to understand."
        primary={{ label: "Start free trial", href: "/signup" }}
        secondary={{ label: "Free readiness check", href: "/compare" }}
      />
    </Section>
  );
}
