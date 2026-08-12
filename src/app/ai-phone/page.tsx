import AIHeader from "@/components/ai/AIHeader";
import AIHeroSection from "@/components/ai/AIHeroSection";
import TrustStrip from "@/components/ai/TrustStrip";
import AIVideoSection from "@/components/ai/AIVideoSection";
import AIProblemSection from "@/components/ai/AIProblemSection";
import AIHowItWorks from "@/components/ai/AIHowItWorks";
import AIFeaturesSection from "@/components/ai/AIFeaturesSection";
import AICallSummarySection from "@/components/ai/AICallSummarySection";
import AIIndustriesSection from "@/components/ai/AIIndustriesSection";
import MissedCallCalculator from "@/components/ai/MissedCallCalculator";
import MissedRevenueScanner from "@/components/ai/MissedRevenueScanner";
import AIPricingSection from "@/components/ai/AIPricingSection";
import StrategyCallSection from "@/components/StrategyCallSection";
import AIFAQSection from "@/components/ai/AIFAQSection";
import AIFinalCTA from "@/components/ai/AIFinalCTA";
import AIFooter from "@/components/ai/AIFooter";

export const metadata = {
  title: "Customers Direct AI Receptionist — Never Miss Another Customer Call",
  description:
    "Your AI Receptionist answers 24/7, qualifies callers, books appointments, and sends you the lead automatically. Built for service businesses.",
};

export default function AIPhonePage() {
  return (
    <>
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
        <StrategyCallSection sectionId="demo" source="ai_phone" />
        <AIFAQSection />
        <AIFinalCTA />
      </main>
      <AIFooter />
    </>
  );
}
