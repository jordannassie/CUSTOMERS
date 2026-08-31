import { Suspense } from "react";
import ContactForm from "@/components/site/ContactForm";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact | Customers.Direct",
  description:
    "Get in touch with the Customers.Direct team. Questions about AI Visibility, ChatGPT Ads, or anything else — we're here to help.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#FAFAF8] min-h-screen">
        {/*
          pt-[100px] accounts for the sticky navigation (≈68px pill + 3px padding + extra breathing room).
          Without this the heading renders behind the floating nav bar.
        */}
        <section className="max-w-5xl mx-auto px-4 pt-28 sm:pt-32 pb-16 sm:pb-24">

          {/* Team photo */}
          <div className="mb-10 rounded-2xl overflow-hidden border border-[#E5E5E1] shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/people/66a95df7-6aa3-4550-a5cf-73026946a51f.png"
              alt="The Customers.Direct team"
              className="w-full object-cover"
              style={{ maxHeight: "400px", objectPosition: "center top" }}
            />
          </div>

          {/* Header */}
          <div className="max-w-xl mb-12">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] bg-[#F0F0EC] border border-[#E5E5E1] px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
              Get in touch
            </div>
            <h1 className="text-[36px] sm:text-[44px] font-bold text-[#171717] leading-[1.1] tracking-tight mb-4">
              Talk to Customers.Direct
            </h1>
            <p className="text-[16px] text-[#777773] leading-relaxed">
              Have a question about AI Visibility, ChatGPT Ads, or anything else?
              Send us a message and we&apos;ll get back to you.
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_320px] gap-10 items-start">
            {/* Form — Suspense required for useSearchParams in ContactForm */}
            <Suspense
              fallback={
                <div className="bg-white border border-[#E5E5E1] rounded-2xl p-8 animate-pulse h-[500px]" />
              }
            >
              <ContactForm source="contact_page" />
            </Suspense>

            {/* Sidebar */}
            <div className="flex flex-col gap-5">

              {/* Products */}
              <div className="bg-white border border-[#E5E5E1] rounded-2xl p-6">
                <h2 className="text-[12.5px] font-bold text-[#171717] mb-4 uppercase tracking-wider">
                  Our products
                </h2>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0 mt-0.5">
                      <BarChart3 size={14} className="text-[#0866F5]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#171717]">AI Visibility</p>
                      <p className="text-[12px] text-[#0866F5] font-semibold mb-0.5">From $149/month</p>
                      <p className="text-[11.5px] text-[#A3A3A0] leading-snug">
                        Track how your business appears in AI answers and compare competitors.
                      </p>
                      <Link
                        href="/pricing"
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#0866F5] hover:underline mt-1"
                      >
                        See plans <ArrowRight size={10} />
                      </Link>
                    </div>
                  </div>

                  <div className="border-t border-[#F0F0EC] pt-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0 mt-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/icons/ai-platforms/chatgpt.svg" alt="" aria-hidden="true" width={14} height={14} className="opacity-80" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#171717]">ChatGPT Ads</p>
                      <p className="text-[12px] text-[#0866F5] font-semibold mb-0.5">$1,000/month + ad spend</p>
                      <p className="text-[11.5px] text-[#A3A3A0] leading-snug">
                        Ad creation and campaign management for paid placements in ChatGPT.
                      </p>
                      <Link
                        href="/ads"
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#0866F5] hover:underline mt-1"
                      >
                        Learn more <ArrowRight size={10} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other */}
              <div className="bg-[#F5F5F2] border border-[#E5E5E1] rounded-2xl p-5">
                <p className="text-[12.5px] font-semibold text-[#555550] mb-1">Something else?</p>
                <p className="text-[12px] text-[#A3A3A0] leading-relaxed">
                  Select &ldquo;Other&rdquo; in the form and tell us what you need.
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
