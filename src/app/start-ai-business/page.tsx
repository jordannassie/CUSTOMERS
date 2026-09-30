import type { Metadata } from "next";
import FunnelHeader from "@/components/launch-kit/FunnelHeader";
import LandingHero from "@/components/launch-kit/LandingHero";
import LandingOpportunity from "@/components/launch-kit/LandingOpportunity";
import LandingRevenue from "@/components/launch-kit/LandingRevenue";
import LandingFirstClient from "@/components/launch-kit/LandingFirstClient";
import LandingOffer from "@/components/launch-kit/LandingOffer";
import LandingFaq from "@/components/launch-kit/LandingFaq";
import SiteFooter from "@/components/site/SiteFooter";

const title = "Build your AI business | Customers.Direct";
const description =
  "Learn how to find businesses missing from ChatGPT, Gemini, and AI search, then offer them an ongoing AI visibility service. One-time $97 Launch Kit.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/start-ai-business" },
  openGraph: {
    type: "website",
    title,
    description,
    url: "https://customers.direct/start-ai-business",
    images: [{ url: "/images/start-ai-business/hero.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/start-ai-business/hero.jpg"],
  },
};

type SearchParams = Promise<{ checkout?: string }>;

export default async function StartAiBusinessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { checkout } = await searchParams;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <FunnelHeader />
      <main>
        {checkout === "canceled" ? (
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-6">
            <p className="border border-[#E5E5E1] bg-white rounded-[4px] px-4 py-3 text-[14px] text-[#171717]">
              Checkout was canceled. No charge was made. You can start again when you are ready.
            </p>
          </div>
        ) : null}
        <LandingHero />
        <LandingOpportunity />
        <LandingRevenue />
        <LandingFirstClient />
        <LandingOffer />
        <LandingFaq />
      </main>
      <SiteFooter />
    </div>
  );
}
