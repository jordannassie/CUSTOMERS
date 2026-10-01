import { Section, Eyebrow, H2 } from "../section";
import { FaqList } from "../home/Faq";

// Billing rules from MVP_SPEC 4 and D-54, D-56, D-57.
const FAQS = [
  {
    q: "Why is the price per business?",
    a: "Each business you track gets its own questions, competitors and reports, so each one has its own plan. Agencies can put some clients on Starter and others on Pro. Everything renews on one date with one invoice.",
  },
  {
    q: "How does the trial charge work?",
    a: "The trial lasts 7 days and covers up to 2 businesses. On day 7 we charge the plan you chose for each business, unless you cancel before then. After that you are billed monthly on the same date.",
  },
  {
    q: "What happens if I run out of credits?",
    a: "A scan that has already started always finishes. After that, new scans wait until your plan renews or you buy a top-up. Your past results stay visible, and we email you when you have used 80% of your credits and again at 0.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrading or adding a business starts right away, and you pay the difference for the rest of the month. Downgrading, removing a business or canceling takes effect at the end of the month you have paid for.",
  },
  {
    q: "Do you give refunds?",
    a: "Monthly plans are not refunded, but you can cancel anytime and keep access until the end of the month. Unused top-up credits can be refunded within 14 days of buying them.",
  },
  {
    q: "What currency do you charge in?",
    a: "US dollars. Your bank may convert the amount if your card is in another currency.",
  },
  {
    q: "I manage a lot of businesses. Is there a bigger plan?",
    a: "Yes. For large agencies we set up custom credits and limits. Send us a message from the contact page and tell us how many businesses you manage.",
  },
] as const;

export function PricingFaq() {
  return (
    <Section id="faq">
      <div className="grid gap-10 md:grid-cols-[1fr_2fr] md:gap-16">
        <div className="flex flex-col gap-4">
          <Eyebrow>FAQ</Eyebrow>
          <H2>Billing questions</H2>
        </div>
        <FaqList items={FAQS} />
      </div>
    </Section>
  );
}
