import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { stripeEnabled } from "@/lib/stripe";
import { AdsHero } from "@/components/site/video-ads/AdsHero";
import { AdsPortfolio } from "@/components/site/video-ads/AdsPortfolio";
import { AdsPricing } from "@/components/site/video-ads/AdsPricing";
import { AdsSteps } from "@/components/site/video-ads/AdsSteps";
import { AdsFaq } from "@/components/site/video-ads/AdsFaq";
import { AdsFinalCta } from "@/components/site/video-ads/AdsFinalCta";
import { VIDEO_AD_PACKAGES } from "@/modules/video-ads/packages";

const TITLE = "AI Video Ads for $99 | Customers.Direct";
const DESCRIPTION =
  "Get 15-second AI video ads for TikTok, Instagram, and Facebook starting at $99. Affordable AI-powered video creative for brands and businesses.";
const CANONICAL = "https://customers.direct/ads";
const OG_IMAGE =
  "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/logos/Customerdirectlogo.jpg";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    type: "website",
    url: CANONICAL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Customers.Direct",
    images: [{ url: OG_IMAGE, alt: "Customers.Direct" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "AI Video Ads",
  url: CANONICAL,
  description: DESCRIPTION,
  provider: {
    "@type": "Organization",
    name: "Customers.Direct",
    url: "https://customers.direct",
  },
  offers: VIDEO_AD_PACKAGES.map((pack) => ({
    "@type": "Offer",
    name: pack.name,
    price: String(pack.amountCents / 100),
    priceCurrency: "USD",
    url: CANONICAL,
  })),
};

export default async function AdsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  const checkoutReady = stripeEnabled;

  return (
    <>
      <SiteHeader />
      <main className="bg-[#FAFAF8] text-[#171717]">
        <AdsHero checkoutReady={checkoutReady} cancelled={params.checkout === "cancelled"} />
        <AdsPortfolio />
        <AdsPricing checkoutReady={checkoutReady} />
        <AdsSteps />
        <AdsFaq />
        <AdsFinalCta checkoutReady={checkoutReady} />
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
