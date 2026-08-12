import Header from "@/components/Header";
import ProcessSection from "@/components/ProcessSection";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

const howItWorksTitle = "How It Works — Customers.Direct";
const howItWorksDescription =
  "See how Customers.Direct turns video ads into new customer conversations, step by step.";
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
      <Header />
      <main className="pt-20">
        <ProcessSection />
      </main>
      <Footer />
    </>
  );
}
