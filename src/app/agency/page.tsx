import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { CTA, Section } from "@/components/marketing/section";
import { ClientListExample } from "@/components/marketing/home/ForAgencies";
import { AgencyWorkflow } from "@/components/marketing/agency/AgencyWorkflow";
import { AgencyBilling } from "@/components/marketing/agency/AgencyBilling";
import { RevenueExample } from "@/components/marketing/agency/RevenueExample";
import { getPublicPricing } from "@/modules/billing";

const title = "For agencies";
const description =
  "Check whether ChatGPT, Claude and Perplexity recommend each of your clients, see which competitors win, and send reports with your logo. All clients in one login.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/agency" },
  openGraph: { type: "website", url: "/agency", title: `${title} | Customers.Direct`, description },
  twitter: { card: "summary_large_image", title: `${title} | Customers.Direct`, description },
};

export default async function AgencyPage() {
  const { plans } = await getPublicPricing();

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="bg-background">
          <div className="mx-auto grid max-w-[1120px] gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-22 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-16">
            <div className="flex min-w-0 flex-col gap-6">
              <h1 className="text-[40px] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[56px]">
                Show every client whether AI recommends them
              </h1>
              <p className="max-w-[52ch] text-lg text-muted-foreground text-pretty">
                Track all your client businesses in one login. See who ChatGPT, Claude and Perplexity name instead of
                them, work through the fixes, and send reports with your logo.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/signup">Start free trial</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/contact?interest=agency">Talk to us</Link>
                </Button>
              </div>
              <p className="text-[13px] text-text-hint">7-day free trial with up to 2 clients. Card needed to start.</p>
            </div>
            <ClientListExample />
          </div>
        </section>

        <AgencyWorkflow />
        <RevenueExample />
        <AgencyBilling plans={plans} />

        <Section>
          <CTA
            title="Try it with 2 of your clients"
            description="Run real scans for 7 days. Cancel before day 7 and you pay nothing."
            primary={{ label: "Start free trial", href: "/signup" }}
            secondary={{ label: "See pricing", href: "/pricing" }}
          />
        </Section>
      </main>
      <Footer />
    </>
  );
}
