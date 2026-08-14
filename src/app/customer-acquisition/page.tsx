import ChatWidget from "@/components/ChatWidget";
import DeliverablesSection from "@/components/DeliverablesSection";
import DifferenceSection from "@/components/DifferenceSection";
import FAQSection from "@/components/FAQSection";
import Hero2Section from "@/components/Hero2Section";
import HeroSection from "@/components/HeroSection";
import HomepageAISection from "@/components/HomepageAISection";
import IndustriesSection from "@/components/IndustriesSection";
import LogosBanner from "@/components/LogosBanner";
import MainFooter from "@/components/MainFooter";
import MainHeader from "@/components/MainHeader";
import MobileCallBar from "@/components/MobileCallBar";
import PricingSection from "@/components/PricingSection";
import PromoBar from "@/components/PromoBar";
import StrategyCallSection from "@/components/StrategyCallSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import TwoWaysSection from "@/components/TwoWaysSection";
import WhyDMsSection from "@/components/WhyDMsSection";

const pageTitle = "Customers.Direct — DM Ads & Customer Acquisition";
const pageDescription =
  "Done-for-you DM ads and customer acquisition campaigns that start direct conversations with people interested in your business.";
const pageImage =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/DM/ChatGPT%20Image%20Aug%2012,%202026,%2002_03_22%20PM%20(6).png";

export const metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: "/dm-ads",
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: "https://customers.direct/dm-ads",
    title: pageTitle,
    description: pageDescription,
    images: [{ url: pageImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [pageImage],
  },
};

export default function CustomerAcquisitionPage() {
  return (
    <>
      <PromoBar />
      <MainHeader />
      <main>
        <Hero2Section />
        <HeroSection />
        <LogosBanner />

        <section className="px-4 sm:px-8 lg:px-12 py-10 bg-white">
          <div className="max-w-6xl mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/51dc4067-6006-4fb8-b2ac-eb64c3c05661.png"
              alt="Customers.Direct"
              className="w-full h-auto rounded-2xl sm:rounded-3xl border border-gray-100 object-cover"
              style={{ aspectRatio: "16/5", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
            />
          </div>
        </section>

        <DifferenceSection />
        <WhyDMsSection />
        <IndustriesSection />
        <DeliverablesSection />

        <section className="px-4 sm:px-8 lg:px-12 py-6 bg-white">
          <div className="max-w-6xl mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/Banners.png"
              alt="Customers Are Messaging You — Direct Messenger"
              className="w-full h-auto rounded-2xl sm:rounded-3xl border border-gray-100 object-cover"
              style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
            />
          </div>
        </section>

        <PricingSection />
        <HomepageAISection />
        <TwoWaysSection />
        <TestimonialsSection />
        <FAQSection />
        <StrategyCallSection />
      </main>
      <MainFooter />
      <ChatWidget />
      <MobileCallBar />
    </>
  );
}
