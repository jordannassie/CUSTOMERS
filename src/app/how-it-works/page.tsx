import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import ProcessSection from "@/components/ProcessSection";
import type { Metadata } from "next";

const howItWorksTitle = "How It Works — Customers.Direct";
const howItWorksDescription =
  "See how Customers.Direct helps AI send customers directly to your business — measuring visibility, answering calls, starting conversations, and converting visitors.";
const howItWorksImage =
  "https://phhczohqidgrvcmszets.supabase.co/storage/v1/object/public/CUSTOMER.direct/images/People/Doctors.png";

export const metadata: Metadata = {
  title: howItWorksTitle,
  description: howItWorksDescription,
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    type: "website",
    siteName: "Customers.Direct",
    url: "https://customers.direct/how-it-works",
    title: howItWorksTitle,
    description: howItWorksDescription,
    images: [{ url: howItWorksImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: howItWorksTitle,
    description: howItWorksDescription,
    images: [howItWorksImage],
  },
};

export default function HowItWorksPage() {
  return (
    <>
      <SiteHeader />
      <main className="pt-8">
        <ProcessSection />
      </main>
      <SiteFooter />
    </>
  );
}
