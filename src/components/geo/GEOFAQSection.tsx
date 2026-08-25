"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Can you guarantee my business will show up in ChatGPT or Google AI Overviews?",
    a: "No — and be skeptical of anyone who says they can. AI models are controlled by OpenAI, Google, Anthropic, and other providers, not by us. We measure your current visibility honestly, show you the evidence behind it, and help you improve the factors that are actually within your control: your content, structured data, citations, and online presence.",
  },
  {
    q: "How is this different from traditional SEO tools?",
    a: "Traditional SEO tools track search engine rankings. Customers.Direct runs real buyer-intent prompts against AI providers (like ChatGPT and Claude) and reports what those models actually say — whether your business is mentioned, where competitors show up instead, and what's cited as a source.",
  },
  {
    q: "Do you use the actual ChatGPT or Claude chat apps to test this?",
    a: "We use each provider's official API, which is the standard, reliable way to test model behavior programmatically. API responses can differ from what you'd see typing into the consumer chat app in a live conversation — we label our methodology clearly on every result so you know exactly how it was produced.",
  },
  {
    q: "What happens after I sign up?",
    a: "You'll give us your website, we'll scan it and pull the details we can find automatically, you'll confirm or correct them, we'll suggest a handful of competitors and prompts to track, and then we run your first visibility scan. You can review and adjust everything before it's finalized — nothing is auto-confirmed on your behalf.",
  },
  {
    q: "What's the difference between the plans?",
    a: "AI Visibility gives you monthly measurement and reporting for one business. Growth Agent adds weekly monitoring, more prompts, and deeper competitive analysis. Autonomous Growth adds hands-on implementation — our team executes approved fixes for you instead of you or your developer doing it.",
  },
];

export default function GEOFAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="gradient-bg py-20 sm:py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] leading-tight">
            Questions, answered honestly.
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map((item, i) => (
            <div key={item.q} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                aria-expanded={open === i}
              >
                <span className="font-bold text-[#0F172A] text-sm sm:text-base">{item.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-[#94A3B8] shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 -mt-1">
                  <p className="text-sm text-[#64748B] leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
