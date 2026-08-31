import type { Metadata } from "next";
import { Suspense } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import AdsPageContent from "./AdsPageContent";

export const metadata: Metadata = {
  title: "ChatGPT Ads Management | Customers.Direct",
  description:
    "We create and manage ChatGPT ad campaigns so your business can reach people as they explore products, services, and their next purchase.",
  openGraph: {
    title: "ChatGPT Ads Management | Customers.Direct",
    description:
      "Ad creation and campaign management for paid placements in ChatGPT. $1,000/month service fee. Advertising spend is separate.",
  },
};

export default function AdsPage() {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <AdsPageContent />
      </Suspense>
      <SiteFooter />
    </>
  );
}
