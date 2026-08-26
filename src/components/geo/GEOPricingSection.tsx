"use client";

import { Check, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface Plan {
  id: string;
  name: string;
  price: string;
  badge?: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "ai_visibility",
    name: "AI Visibility",
    price: "$497",
    description: "See where you stand today.",
    features: [
      "1 business tracked",
      "~50 buyer-intent prompts monitored",
      "Monthly monitoring runs",
      "Direct Score + competitor comparison",
      "Opportunity recommendations",
      "\"Send to Claude\" implementation packages",
    ],
    cta: "Start AI Visibility",
  },
  {
    id: "growth_agent",
    name: "Growth Agent",
    price: "$997",
    badge: "Most Popular",
    description: "Track it weekly and go deeper.",
    features: [
      "Everything in AI Visibility",
      "Weekly monitoring runs",
      "~100 buyer-intent prompts monitored",
      "Deeper competitive analysis",
      "Full GEO audit of your site",
      "Priority opportunity generation",
    ],
    cta: "Start Growth Agent",
    highlight: true,
  },
  {
    id: "autonomous_growth",
    name: "Autonomous Growth",
    price: "From $1,997",
    description: "We implement the fixes for you.",
    features: [
      "Everything in Growth Agent",
      "Customers.Direct executes approved changes",
      "Human-in-the-loop approval workflow",
      "Priority implementation queue",
      "Dedicated account oversight",
    ],
    cta: "Talk to Us",
  },
];

export default function GEOPricingSection() {
  return (
    <section id="pricing" className="bg-white py-20 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#777773] mb-4">
            Simple Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#171717] leading-tight mb-4">
            Pick the level of help you need.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl border p-8 flex flex-col ${
                plan.highlight
                  ? "border-transparent bg-[#0F172A] text-white"
                  : "border-gray-100 bg-white"
              }`}
              style={
                plan.highlight
                  ? { boxShadow: "0 16px 48px rgba(15,23,42,0.25)" }
                  : { boxShadow: "0 8px 32px rgba(15,23,42,0.06)" }
              }
            >
              {plan.badge && (
                <span className="absolute -top-3 left-8 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}

              <span
                className={`text-xs font-bold uppercase tracking-widest mb-4 ${
                  plan.highlight ? "text-white/60" : "text-[#777773]"
                }`}
              >
                {plan.name}
              </span>

              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className={`text-sm mb-1 font-medium ${plan.highlight ? "text-white/60" : "text-[#777773]"}`}>
                  /month
                </span>
              </div>
              <p className={`text-sm mb-7 leading-relaxed ${plan.highlight ? "text-white/70" : "text-[#777773]"}`}>
                {plan.description}
              </p>

              <div className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        plan.highlight
                          ? "bg-white/10 border border-white/20"
                          : "bg-[#F0F0EC] border border-[#DBEAFE]"
                      }`}
                    >
                      <Check size={11} className={plan.highlight ? "text-white" : "text-[#777773]"} aria-hidden="true" />
                    </div>
                    <span className={`text-sm ${plan.highlight ? "text-white/80" : "text-[#777773]"}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="/signup"
                className={`flex items-center justify-center gap-2 font-bold py-3.5 rounded-full transition-colors text-sm w-full ${
                  plan.highlight
                    ? "bg-white text-[#171717] hover:bg-gray-100"
                    : "bg-[#171717] text-white hover:bg-[#2A2A2A]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-10 flex items-start gap-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl px-5 py-4">
          <ShieldAlert size={18} className="text-[#B45309] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-[#92400E] leading-relaxed">
            <strong>No guaranteed AI rankings — ever.</strong> AI models change constantly and no
            company can promise a specific mention, position, or outcome inside ChatGPT,
            Claude, Perplexity, or any other AI product. Customers.Direct measures your
            visibility honestly and helps you improve the factors within your control.
          </p>
        </div>
      </div>
    </section>
  );
}
