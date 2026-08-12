import SalesHeader from "@/components/sales/SalesHeader";
import SalesHero from "@/components/sales/SalesHero";
import SalesWhySection from "@/components/sales/SalesWhySection";
import SalesHowSection from "@/components/sales/SalesHowSection";
import AIFooter from "@/components/ai/AIFooter";

export const metadata = {
  title: "Customers Direct Sales Program — Help Businesses Capture More Calls",
  description:
    "Join the Customers Direct Sales Program and help service businesses stop losing customers to missed calls with AI Receptionist.",
};

export default function SalesPage() {
  return (
    <>
      <SalesHeader />
      <main>
        <SalesHero />
        <SalesWhySection />
        <SalesHowSection />

        {/* Apply CTA */}
        <section id="apply" className="bg-[#0F172A] py-24 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-white/40 mb-6">
              Get Started
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
              Ready to get started?
            </h2>
            <p className="text-lg text-white/60 leading-relaxed mb-10 max-w-xl mx-auto">
              Apply to join the Customers Direct Sales Program. We&apos;ll follow up to discuss
              whether the program is a good fit and walk you through how it works.
            </p>
            <a
              href="https://calendar.app.google/muM2Kqc8oYnWBPXXA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold px-10 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Apply to Sales Program →
            </a>
            <p className="text-xs text-white/30 mt-4">
              This is not an employment offer. Commission details will be shared during the discovery conversation.
            </p>
          </div>
        </section>
      </main>
      <AIFooter />
    </>
  );
}
