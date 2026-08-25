import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import HeroSection from "@/components/HeroSection";
import LogosBanner from "@/components/LogosBanner";
import DifferenceSection from "@/components/DifferenceSection";
import WhyDMsSection from "@/components/WhyDMsSection";
import IndustriesSection from "@/components/IndustriesSection";
import DeliverablesSection from "@/components/DeliverablesSection";
import PricingSection from "@/components/PricingSection";
import FAQSection from "@/components/FAQSection";
import StrategyCallSection from "@/components/StrategyCallSection";
import PromoBar from "@/components/PromoBar";
import Hero2Section from "@/components/Hero2Section";
import ChatWidget from "@/components/ChatWidget";

export const metadata = {
  title: "Customers.Direct — DM Customer Acquisition",
  description:
    "Customers.Direct creates and runs targeted video ads that start real conversations with people interested in your services.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function Home2() {
  return (
    <>
      <PromoBar />
      <SiteHeader />
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
        <FAQSection />
        <StrategyCallSection />
      </main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
