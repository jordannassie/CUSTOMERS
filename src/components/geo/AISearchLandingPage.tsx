import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import AgencySection from "@/components/site/AgencySection";
import GEOHeroSection from "./GEOHeroSection";
import GEOProblemSection from "./GEOProblemSection";
import GEODashboardShowcase from "./GEODashboardShowcase";
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
        <GEODashboardShowcase />
        <GEOProductLoop />
        <AgencySection />
        <GEOPricingSection />
        <GEOFAQSection />
        <GEOFinalCTA />
      </main>
      <SiteFooter />
    </>
  );
}
