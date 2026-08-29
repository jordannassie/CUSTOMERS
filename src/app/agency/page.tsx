import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import AgencyPageContent from "./AgencyPageContent";

export const metadata: Metadata = {
  title: "AI Visibility Software for Agencies",
  description:
    "Help your agency track client visibility across AI search, compare competitors, and turn AI visibility into a recurring service for your clients.",
  openGraph: {
    type: "website",
    title: "AI Visibility Software for Agencies | Customers.Direct",
    description:
      "Help your agency track client visibility across AI search, compare competitors, and turn AI visibility into a recurring service for your clients.",
    url: "https://customers.direct/agency",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Visibility Software for Agencies | Customers.Direct",
    description:
      "Help your agency track client visibility across AI search, compare competitors, and turn AI visibility into a recurring service for your clients.",
  },
};

export default function AgencyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <AgencyPageContent />
      </main>
      <SiteFooter />
    </>
  );
}
