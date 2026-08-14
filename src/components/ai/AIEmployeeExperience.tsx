import ChatWidget from "@/components/ChatWidget";
import MobileCallBar from "@/components/MobileCallBar";
import PromoBar from "@/components/PromoBar";
import StrategyCallSection from "@/components/StrategyCallSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import AICallSummarySection from "./AICallSummarySection";
import AIFAQSection from "./AIFAQSection";
import AIFeaturesSection from "./AIFeaturesSection";
import AIFinalCTA from "./AIFinalCTA";
import AIFooter from "./AIFooter";
import AIHeader from "./AIHeader";
import AIHeroSection from "./AIHeroSection";
import AIHowItWorks from "./AIHowItWorks";
import AIIndustriesSection from "./AIIndustriesSection";
import AIPricingSection from "./AIPricingSection";
import AIProblemSection from "./AIProblemSection";
import AIVideoSection from "./AIVideoSection";
import MissedCallCalculator from "./MissedCallCalculator";
import MissedRevenueScanner from "./MissedRevenueScanner";
import TrustStrip from "./TrustStrip";

export default function AIEmployeeExperience() {
  return (
    <>
      <PromoBar />
      <AIHeader />
      <main>
        <AIHeroSection />
        <TrustStrip />
        <AIVideoSection />
        <AIProblemSection />
        <AIHowItWorks />
        <AIFeaturesSection />
        <AICallSummarySection />
        <AIIndustriesSection />
        <MissedCallCalculator />
        <MissedRevenueScanner />
        <AIPricingSection />
        <TestimonialsSection />
        <StrategyCallSection sectionId="demo" source="ai_phone" />
        <AIFAQSection />
        <AIFinalCTA />
      </main>
      <AIFooter />
      <ChatWidget />
      <MobileCallBar />
    </>
  );
}
