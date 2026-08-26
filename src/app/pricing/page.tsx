import { Check, Shield, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PLANS } from "@/lib/plans";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Customers.Direct",
  description:
    "Simple, transparent pricing for AI visibility monitoring, SEO intelligence, and the Direct Agent. Know exactly where customers find you in AI search.",
};

const ORDERED_PLANS = [
  PLANS.ai_visibility,
  PLANS.growth_agent,
  PLANS.autonomous_growth,
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E5E1] px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" aria-label="Customers.Direct — Home">
            <Image
              src="/images/logos/logo-black.png"
              alt="Customers.Direct"
              width={140}
              height={34}
              className="h-9 w-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#777773] hover:text-[#171717] transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-[13px] font-semibold bg-[#171717] text-white px-4 py-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              Get started →
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        {/* Headline */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#777773] mb-4">
            Simple Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-[48px] font-bold text-[#171717] leading-tight mb-5">
            Pick the level of help you need.
          </h1>
          <p className="text-[16px] text-[#777773] max-w-xl mx-auto leading-relaxed">
            Every plan includes real AI visibility scanning across ChatGPT, Claude, and Perplexity — no fake data, no inflated scores.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-14">
          {ORDERED_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border flex flex-col overflow-hidden ${
                plan.popular
                  ? "border-[#171717] bg-[#171717] text-white"
                  : "border-[#E5E5E1] bg-white"
              }`}
              style={
                plan.popular
                  ? { boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }
                  : { boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }
              }
            >
              {plan.popular && (
                <div className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-6 py-2 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-7 flex flex-col flex-1">
                <div className="mb-6">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${
                      plan.popular ? "text-white/50" : "text-[#A3A3A0]"
                    }`}
                  >
                    {plan.name}
                  </span>
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-[38px] font-bold leading-none">
                      {plan.priceLabel.split("/")[0]}
                    </span>
                    {plan.priceLabel.includes("/") && (
                      <span
                        className={`text-[13px] mb-1 ${plan.popular ? "text-white/50" : "text-[#A3A3A0]"}`}
                      >
                        /month
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[13px] leading-snug ${plan.popular ? "text-white/70" : "text-[#777773]"}`}
                  >
                    {plan.tagline}
                  </p>
                </div>

                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span
                        className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          plan.popular ? "bg-white/15" : "bg-[#F0F0EC]"
                        }`}
                      >
                        <Check
                          size={10}
                          className={plan.popular ? "text-white" : "text-[#777773]"}
                          aria-hidden="true"
                        />
                      </span>
                      <span
                        className={`text-[13px] leading-snug ${
                          plan.popular ? "text-white/80" : "text-[#555552]"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.id === "autonomous_growth" ? (
                  <a
                    href="/book"
                    className={`flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors text-[13px] w-full ${
                      plan.popular
                        ? "bg-white text-[#171717] hover:bg-gray-100"
                        : "bg-[#171717] text-white hover:bg-[#2A2A2A]"
                    }`}
                  >
                    Talk to us
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                ) : plan.stripePriceId ? (
                  <Link
                    href={`/signup?plan=${plan.id}`}
                    className={`flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors text-[13px] w-full ${
                      plan.popular
                        ? "bg-white text-[#171717] hover:bg-gray-100"
                        : "bg-[#171717] text-white hover:bg-[#2A2A2A]"
                    }`}
                  >
                    Start {plan.name}
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                ) : (
                  <a
                    href="mailto:hello@customers.direct?subject=Plan enquiry"
                    className={`flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors text-[13px] w-full border ${
                      plan.popular
                        ? "border-white/20 text-white hover:bg-white/10"
                        : "border-[#E5E5E1] text-[#777773] hover:bg-[#F5F5F2]"
                    }`}
                  >
                    Contact us
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="max-w-3xl mx-auto mb-16 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[12.5px] text-amber-800 leading-relaxed">
            <strong>No guaranteed AI rankings — ever.</strong> AI models change constantly and no
            company can promise a specific mention, position, or outcome inside ChatGPT, Claude,
            Perplexity, or any other AI product. Customers.Direct measures your visibility
            honestly and helps you improve the factors within your control.
          </p>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[20px] font-bold text-[#171717] mb-8 text-center">
            Common questions
          </h2>
          <div className="flex flex-col gap-6">
            {[
              {
                q: "Which AI models do you track?",
                a: "We track ChatGPT (OpenAI), Claude (Anthropic), and Perplexity. We scan buyer-intent prompts relevant to your business and record whether you're mentioned, your position, and which competitors appear.",
              },
              {
                q: "What does the Direct Score mean?",
                a: "Your Direct Score (0–100) reflects how often your business is mentioned in the AI searches most relevant to your category, location, and services. Higher is better.",
              },
              {
                q: "How does the Growth Agent plan add SEO intelligence?",
                a: "Growth Agent includes DataForSEO-powered keyword rankings, organic traffic estimates, competitor keyword gaps, and backlink data — so you see both your AI visibility and your traditional search performance in one dashboard.",
              },
              {
                q: "Can I manage multiple businesses?",
                a: "Yes. Growth Agent supports 3 businesses, Autonomous Growth supports 10. All are managed from a single login with no data mixing between workspaces.",
              },
              {
                q: "How do I cancel?",
                a: "Log in, go to Settings → Plan & Billing, and click Manage Billing. From the Stripe customer portal you can cancel at any time — no long-term contract.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-[#E5E5E1] pb-6">
                <p className="text-[14px] font-semibold text-[#171717] mb-2">{q}</p>
                <p className="text-[13px] text-[#777773] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E1] bg-white py-8 px-4 mt-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[#A3A3A0]">
            © {new Date().getFullYear()} Customers.Direct. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-[12px] text-[#A3A3A0]">
            <Link href="/privacy" className="hover:text-[#777773] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#777773] transition-colors">Terms</Link>
            <a href="mailto:hello@customers.direct" className="hover:text-[#777773] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
