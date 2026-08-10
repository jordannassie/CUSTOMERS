import Header from "@/components/Header";
import ProcessSection from "@/components/ProcessSection";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works — Customers.Direct",
  description: "See how Customers.Direct turns video ads into new customer conversations, step by step.",
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
