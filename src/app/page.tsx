import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProcessSection from "@/components/ProcessSection";
import IndustriesSection from "@/components/IndustriesSection";
import DeliverablesSection from "@/components/DeliverablesSection";
import PricingSection from "@/components/PricingSection";
import StrategyCallSection from "@/components/StrategyCallSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ProcessSection />
        <IndustriesSection />
        <DeliverablesSection />
        <PricingSection />
        <StrategyCallSection />
      </main>
      <Footer />
    </>
  );
}
