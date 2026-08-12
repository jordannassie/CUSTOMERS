import MainHeader from "@/components/MainHeader";
import Hero2Section from "@/components/Hero2Section";
import HeroSection from "@/components/HeroSection";
import LogosBanner from "@/components/LogosBanner";
import DifferenceSection from "@/components/DifferenceSection";
import WhyDMsSection from "@/components/WhyDMsSection";
import IndustriesSection from "@/components/IndustriesSection";
import DeliverablesSection from "@/components/DeliverablesSection";
import PricingSection from "@/components/PricingSection";
import HomepageAISection from "@/components/HomepageAISection";
import TwoWaysSection from "@/components/TwoWaysSection";
import FAQSection from "@/components/FAQSection";
import StrategyCallSection from "@/components/StrategyCallSection";
import MainFooter from "@/components/MainFooter";
import PromoBar from "@/components/PromoBar";
import ChatWidget from "@/components/ChatWidget";
import MobileCallBar from "@/components/MobileCallBar";
import TestimonialsSection from "@/components/TestimonialsSection";

const homeTitle = "Customers.Direct — Get More Customers. Never Miss Another One.";
const homeDescription =
  "Customer Acquisition + AI Receptionist for growing businesses. We help you create more customer opportunities and make sure you're there when customers respond.";
const homeImage =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/DM/ChatGPT%20Image%20Aug%2012,%202026,%2002_03_22%20PM%20(6).png";

export const metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: "https://customers.direct/",
    title: homeTitle,
    description: homeDescription,
    images: [{ url: homeImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: homeTitle,
    description: homeDescription,
    images: [homeImage],
  },
};

export default function Home() {
  return (
    <>
      <PromoBar />
      <MainHeader />
      <main>
        <Hero2Section />
        <HeroSection />
        <LogosBanner />

        {/* Banner image */}
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

        {/* DM banner */}
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

        {/* ── AI Receptionist teaser ─────────────────────────────────── */}
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
