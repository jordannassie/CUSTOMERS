import type { Metadata } from "next";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import ChatWidget from "@/components/ChatWidget";
import { Hero } from "@/components/marketing/home/Hero";
import { HowItWorks } from "@/components/marketing/home/HowItWorks";
import { ProductTabs } from "@/components/marketing/home/ProductTabs";
import { ForAgencies } from "@/components/marketing/home/ForAgencies";
import { PricingSummary } from "@/components/marketing/home/PricingSummary";
import { Faq } from "@/components/marketing/home/Faq";
import { FinalCta } from "@/components/marketing/home/FinalCta";

const title = "Customers.Direct: see if AI recommends your business";
const description =
  "Check whether ChatGPT, Claude and Perplexity recommend your business for the questions local customers ask, see why competitors win, and get steps to fix it.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: "/",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ProductTabs />
        <ForAgencies />
        <PricingSummary />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
