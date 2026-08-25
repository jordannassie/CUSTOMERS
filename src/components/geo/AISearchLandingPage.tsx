import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import GEOHeroSection from "./GEOHeroSection";
import GEOProblemSection from "./GEOProblemSection";
import GEOProductLoop from "./GEOProductLoop";
import GEOPricingSection from "./GEOPricingSection";
import GEOFAQSection from "./GEOFAQSection";
import GEOFinalCTA from "./GEOFinalCTA";

export default function AISearchLandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <GEOHeroSection />
        <GEOProblemSection />
        <GEOProductLoop />
        <GEOPricingSection />
        <GEOFAQSection />
        <GEOFinalCTA />
      </main>
      <SiteFooter />
    </>
  );
}
