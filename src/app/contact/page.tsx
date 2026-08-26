import { Suspense } from "react";
import ContactForm from "./ContactForm";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Customers.Direct",
  description: "Get in touch with the Customers.Direct team. Have a question about AI visibility, your account, or using Customers.Direct for your business?",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#FAFAF8] min-h-screen">
        <section className="max-w-5xl mx-auto px-4 py-16 sm:py-24">

          {/* Header */}
          <div className="max-w-xl mb-12">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] bg-[#F0F0EC] border border-[#E5E5E1] px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
              Get in touch
            </div>
            <h1 className="text-[36px] sm:text-[44px] font-bold text-[#171717] leading-[1.1] tracking-tight mb-4">
              Talk to Customers.Direct
            </h1>
            <p className="text-[16px] text-[#777773] leading-relaxed">
              Have a question about AI visibility, your account, or using Customers.Direct for your business?
              Send us a message and we&apos;ll get back to you.
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_340px] gap-10 items-start">
            {/* Form — Suspense required for useSearchParams */}
            <Suspense fallback={<div className="bg-white border border-[#E5E5E1] rounded-2xl p-8 animate-pulse h-[480px]" />}>
              <ContactForm />
            </Suspense>

            {/* Sidebar info */}
            <div className="flex flex-col gap-6">
              <div className="bg-white border border-[#E5E5E1] rounded-2xl p-6">
                <h2 className="text-[13px] font-bold text-[#171717] mb-4">Contact topics</h2>
                <ul className="flex flex-col gap-3">
                  {[
                    { topic: "Product Question",           desc: "How features work, integrations, capabilities." },
                    { topic: "Account / Support",          desc: "Login issues, account settings, data questions." },
                    { topic: "Sales",                      desc: "Pricing, plans, getting started." },
                    { topic: "Enterprise",                 desc: "Custom plans, multi-location, procurement." },
                    { topic: "Multiple Businesses / Agency", desc: "Managing multiple client businesses from one login." },
                  ].map(({ topic, desc }) => (
                    <li key={topic} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0866F5] mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[12.5px] font-semibold text-[#171717]">{topic}</p>
                        <p className="text-[11.5px] text-[#A3A3A0] leading-snug">{desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0866F5]/5 border border-[#0866F5]/15 rounded-2xl p-5">
                <p className="text-[13px] font-semibold text-[#0866F5] mb-1">Free during beta</p>
                <p className="text-[12px] text-[#777773] leading-relaxed">
                  Customers.Direct is currently free for early users.
                  No credit card required — full product access.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
