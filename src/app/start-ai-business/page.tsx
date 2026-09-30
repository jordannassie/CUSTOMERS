import type { Metadata } from "next";
import Image from "next/image";
import { Check } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import LaunchKitBuyButton from "@/components/site/LaunchKitBuyButton";

const title = "Start your own AI business for $97 | Customers.Direct";
const description =
  "Learn how to help local businesses get found in ChatGPT, Gemini, and AI search. Then sell them an ongoing monthly AI visibility service. One-time $97 Launch Kit.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/start-ai-business" },
  openGraph: {
    type: "website",
    title,
    description,
    url: "https://customers.direct/start-ai-business",
    images: [{ url: "/images/start-ai-business/hero.jpg" }],
  },
};

const bullets = [
  "One-time payment",
  "Simple step-by-step training",
  "Sales scripts and templates",
  "Pricing guide",
  "First-client checklist",
];

const steps = [
  {
    n: "1",
    title: "Find",
    body: "Find a local business that wants more customers.",
  },
  {
    n: "2",
    title: "Show",
    body: "Use Customers.Direct to show how they appear in AI search compared with competitors.",
  },
  {
    n: "3",
    title: "Sell",
    body: "Offer ongoing AI visibility monitoring and reporting for a monthly fee.",
  },
];

const revenue = [
  { clients: 5, total: "$2,500/month" },
  { clients: 10, total: "$5,000/month" },
  { clients: 20, total: "$10,000/month" },
  { clients: 40, total: "$20,000/month" },
];

const included = [
  "AI Business Training",
  "Your Offer",
  "Prospecting Scripts",
  "Proposal Template",
  "Pricing Guide",
  "First Client Checklist",
  "Live Software Walkthrough",
  "Bonus Resources",
];

export default function StartAiBusinessPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <SiteHeader />
      <main>
        <section className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pt-16 sm:pb-20">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-[#0866F5] mb-4">
                AI Business Launch Kit
              </p>
              <h1 className="text-[32px] sm:text-[44px] font-bold leading-[1.1] tracking-tight text-[#171717]">
                Start your own AI business for $97.
              </h1>
              <p className="mt-5 text-[16px] sm:text-[18px] leading-7 text-[#6B6B67]">
                Learn how to help local businesses get found in ChatGPT, Gemini, and
                AI search. Then sell them an ongoing monthly AI visibility service.
              </p>
              <ul className="mt-6 space-y-2">
                {bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[14px] text-[#171717]">
                    <Check size={16} className="text-[#15803D] mt-0.5 shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <LaunchKitBuyButton />
              </div>
              <p className="mt-3 text-[13px] text-[#737370]">One-time payment. No monthly fees.</p>
            </div>
            <div className="rounded-2xl border border-[#E5E5E1] bg-white overflow-hidden">
              <Image
                src="/images/start-ai-business/hero.jpg"
                alt="AI Business Launch Kit: training, scripts, templates, and a $97 offer"
                width={1200}
                height={1500}
                priority
                className="w-full h-auto"
              />
            </div>
          </div>
        </section>

        <section className="border-t border-[#E5E5E1] bg-white">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[#171717]">
              A simple business you can start with one client.
            </h2>
            <div className="mt-8 grid md:grid-cols-3 gap-4">
              {steps.map((step) => (
                <div key={step.title} className="border border-[#E5E5E1] rounded-2xl bg-[#FAFAF8] p-6">
                  <p className="text-[12px] font-semibold text-[#0866F5]">{step.n}</p>
                  <h3 className="mt-2 text-[18px] font-semibold text-[#171717]">{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-[#6B6B67]">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#E5E5E1] bg-[#FAFAF8]">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[#171717]">
              See how monthly clients can add up.
            </h2>
            <p className="mt-2 text-[14px] text-[#6B6B67]">Examples only. Not a promise.</p>
            <div className="mt-8 grid sm:grid-cols-2 gap-3">
              {revenue.map((row) => (
                <div
                  key={row.clients}
                  className="border border-[#E5E5E1] rounded-2xl bg-white px-5 py-4 text-[15px] text-[#171717] tabular-nums"
                >
                  {row.clients} clients × $500/month = {row.total}
                </div>
              ))}
            </div>
            <p className="mt-6 text-[13px] leading-6 text-[#737370] max-w-[720px]">
              Examples are illustrative only, not guaranteed earnings. Results depend
              on effort, pricing, sales, market, and client retention.
            </p>
          </div>
        </section>

        <section className="border-t border-[#E5E5E1] bg-white">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[#171717]">
              Everything you need to get your first client.
            </h2>
            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {included.map((item) => (
                <div
                  key={item}
                  className="border border-[#E5E5E1] rounded-2xl bg-[#FAFAF8] px-4 py-5 text-[14px] font-medium text-[#171717]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#E5E5E1] bg-[#FAFAF8]">
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="max-w-[560px]">
              <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[#171717]">
                Start your AI business today.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[#6B6B67]">
                One-time $97 payment. Get the system, scripts, and plan to begin.
              </p>
              <div className="mt-7">
                <LaunchKitBuyButton />
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
