import GEOHeader from "./GEOHeader";
import GEOHeroSection from "./GEOHeroSection";
import GEOProblemSection from "./GEOProblemSection";
import GEOProductLoop from "./GEOProductLoop";
import GEOPricingSection from "./GEOPricingSection";
import GEOFAQSection from "./GEOFAQSection";
import GEOFinalCTA from "./GEOFinalCTA";
import GEOFooter from "./GEOFooter";

export default function AISearchLandingPage() {
  return (
    <>
      <GEOHeader />
      <main>
        <GEOHeroSection />
        <GEOProblemSection />
        <GEOProductLoop />
        <GEOPricingSection />
        <GEOFAQSection />
        <GEOFinalCTA />
      </main>
      <GEOFooter />
    </>
  );
}
