import type { Metadata } from "next";
import Header from "@/components/marketing/Header";
import Footer from "@/components/marketing/Footer";
import AgencyPageContent from "./AgencyPageContent";

export const metadata: Metadata = {
  title: "AEO Software for Marketing Agencies | Customers.Direct",
  description:
    "Help your agency track client visibility in AI search, compare competitors, identify improvements, and deliver client-ready reports from one dashboard.",
  openGraph: {
    type: "website",
    title: "AEO Software for Marketing Agencies | Customers.Direct",
    description:
      "Help your agency track client visibility in AI search, compare competitors, identify improvements, and deliver client-ready reports from one dashboard.",
    url: "https://customers.direct/agency",
  },
  twitter: {
    card: "summary_large_image",
    title: "AEO Software for Marketing Agencies | Customers.Direct",
    description:
      "Help your agency track client visibility in AI search, compare competitors, identify improvements, and deliver client-ready reports from one dashboard.",
  },
};

export default function AgencyPage() {
  return (
    <>
      <Header />
      <main>
        <AgencyPageContent />
      </main>
      <Footer />
    </>
  );
}
