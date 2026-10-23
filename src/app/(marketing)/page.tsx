import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import ChatWidget from "@/components/ChatWidget";
import { Hero } from "@/components/marketing/home/Hero";
import { HowItWorks } from "@/components/marketing/home/HowItWorks";
import { ProductTabs } from "@/components/marketing/home/ProductTabs";
import { ForAgencies } from "@/components/marketing/home/ForAgencies";
import { PricingSummary } from "@/components/marketing/home/PricingSummary";
import { Faq } from "@/components/marketing/home/Faq";
import { FinalCta } from "@/components/marketing/home/FinalCta";
import { NewsletterSignup } from "@/components/site/NewsletterSignup";
import { HomeAppsSection } from "@/components/site/apps/HomeAppsSection";
import StartAiBusinessHomeSection from "@/components/site/StartAiBusinessHomeSection";
import { env } from "@/lib/env";
import { listNativeSummaries } from "@/modules/apps-directory/reviews/dal";
import { getPublicPricing } from "@/modules/billing";

// Title, description and link preview come from the root layout.
export const metadata: Metadata = { alternates: { canonical: "/" } };

// Published app review ratings for the AI apps section (merged from main), cached like the prices.
async function appRatings() {
  "use cache";
  cacheLife("minutes");
  return listNativeSummaries();
}

export default async function Home() {
  const [{ plans }, ratings] = await Promise.all([getPublicPricing(), appRatings()]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <NewsletterSignup
          placement="homepage"
          variant="hero"
          embedSrc={env.NEXT_PUBLIC_BEEHIIV_EMBED_SRC}
          formId={env.NEXT_PUBLIC_BEEHIIV_FORM_ID}
          embed
        />
        <HomeAppsSection ratings={ratings} />
        <HowItWorks />
        <ProductTabs />
        <ForAgencies />
        <StartAiBusinessHomeSection />
        <PricingSummary plans={plans} />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
