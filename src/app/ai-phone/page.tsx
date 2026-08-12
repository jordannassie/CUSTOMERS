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
import TestimonialsSection from "@/components/TestimonialsSection";
import AIFAQSection from "@/components/ai/AIFAQSection";
import AIFinalCTA from "@/components/ai/AIFinalCTA";
import AIFooter from "@/components/ai/AIFooter";
import ChatWidget from "@/components/ChatWidget";
import MobileCallBar from "@/components/MobileCallBar";

const aiPhoneTitle = "Customers Direct AI Receptionist — Never Miss Another Customer Call";
const aiPhoneDescription =
  "Your AI Receptionist answers 24/7, qualifies callers, books appointments, and sends you the lead automatically. Built for service businesses.";
const aiPhoneImage =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/banners/AIPHONE/ChatGPT%20Image%20Aug%2012,%202026,%2002_02_33%20PM%20(7).png";

export const metadata = {
  title: aiPhoneTitle,
  description: aiPhoneDescription,
  alternates: {
    canonical: "/ai-phone",
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: "https://customers.direct/ai-phone",
    title: aiPhoneTitle,
    description: aiPhoneDescription,
    images: [{ url: aiPhoneImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: aiPhoneTitle,
    description: aiPhoneDescription,
    images: [aiPhoneImage],
  },
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
