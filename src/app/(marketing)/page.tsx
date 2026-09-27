import type { Metadata } from "next";
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
import { getPublicPricing } from "@/modules/billing";

// Title, description and link preview come from the root layout.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const { plans } = await getPublicPricing();

  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ProductTabs />
        <ForAgencies />
        <PricingSummary plans={plans} />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
