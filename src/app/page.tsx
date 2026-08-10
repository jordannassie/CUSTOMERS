import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import LogosBanner from "@/components/LogosBanner";
import DifferenceSection from "@/components/DifferenceSection";
import ProcessSection from "@/components/ProcessSection";
import WhyDMsSection from "@/components/WhyDMsSection";
import IndustriesSection from "@/components/IndustriesSection";
import DeliverablesSection from "@/components/DeliverablesSection";
import PricingSection from "@/components/PricingSection";
import FAQSection from "@/components/FAQSection";
import StrategyCallSection from "@/components/StrategyCallSection";
import Footer from "@/components/Footer";
import Hero2Section from "@/components/Hero2Section";
import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero2Section />

        <HeroSection />
        <LogosBanner />

        {/* ── Banner image ── */}
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

        {/* <ProcessSection /> — hidden temporarily */}
        <WhyDMsSection />
        <IndustriesSection />
        <DeliverablesSection />

        {/* ── DM banner ── */}
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
      <Footer />
      <ChatWidget />
    </>
  );
}
