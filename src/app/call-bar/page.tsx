import type { Metadata } from "next";
import AIHeader from "@/components/ai/AIHeader";
import AIFooter from "@/components/ai/AIFooter";
import CallBarGenerator from "@/components/call-bar/CallBarGenerator";

export const metadata: Metadata = {
  title: "Free Mobile Call Bar Generator | Customers.Direct",
  description:
    "Create a free mobile website Call Bar so visitors can call your business with one tap. Customize it, preview it, and copy one lightweight embed.",
  alternates: { canonical: "/call-bar" },
  openGraph: {
    type: "website",
    url: "https://customers.direct/call-bar",
    siteName: "Customers.Direct",
    title: "Never Lose a Mobile Visitor Who Wants to Call",
    description:
      "Build a free one-tap mobile Call Bar for your business website.",
  },
};

export default function CallBarPage() {
  return (
    <>
      <AIHeader />
      <CallBarGenerator />
      <AIFooter />
    </>
  );
}
