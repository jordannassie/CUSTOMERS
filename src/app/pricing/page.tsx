import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import { CTA, Section } from "@/components/marketing/section";
import { PlanCards } from "@/components/marketing/pricing/PlanCards";
import { TrialTerms } from "@/components/marketing/pricing/TrialTerms";
import { Credits } from "@/components/marketing/pricing/Credits";
import { PricingFaq } from "@/components/marketing/pricing/PricingFaq";
import { getPublicPricing } from "@/modules/billing";
import { pageMetadata } from "@/lib/site-metadata";

const title = "Pricing";
const description =
  "Starter and Pro plans, priced per business each month with credits included. Try it free for 7 days with a card, and cancel before day 7 to pay nothing.";

export const metadata: Metadata = pageMetadata({ title, description, path: "/pricing" });

export default async function PricingPage() {
  const { plans, packs } = await getPublicPricing();

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="bg-background">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-22">
            <h1 className="max-w-[18ch] text-[40px] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[56px]">
              Pay for each business you track
            </h1>
            <p className="max-w-[56ch] text-lg text-muted-foreground text-pretty">
              Both plans check ChatGPT, Claude and Perplexity. Pro gives each business more credits and more competitors
              to compare. Start with a 7-day free trial.
            </p>
            <div className="mt-6">
              <PlanCards plans={plans} />
            </div>
            <p className="text-[15px] text-muted-foreground">
              Prices are in US dollars. Managing many businesses?{" "}
              <Link href="/contact?interest=agency" className="text-primary underline-offset-4 hover:underline">
                Ask us about a custom plan
              </Link>
              .
            </p>
          </div>
        </section>

        <TrialTerms />
        <Credits plans={plans} packs={packs} />
        <PricingFaq />

        <Section tone="muted">
          <CTA
            title="See what AI says about your business"
            description="Your first scan runs during the free trial. Cancel before day 7 and you pay nothing."
            primary={{ label: "Start free trial", href: "/signup" }}
            secondary={{ label: "Talk to us", href: "/contact" }}
          />
        </Section>
      </main>
      <Footer />
    </>
  );
}
