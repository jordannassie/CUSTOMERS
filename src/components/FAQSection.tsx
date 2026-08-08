"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What does the $2,500 monthly service include?",
    a: "We create your video ad, build and manage your Meta campaign, target the right audience and optimize the campaign to generate customer conversations directly in your DMs.",
  },
  {
    q: "Is advertising spend included in the $2,500?",
    a: "No. Your advertising budget is paid separately and directly to Meta. Most clients begin with approximately $2,500 per month in advertising spend.",
  },
  {
    q: "What is my total monthly investment?",
    a: "With the recommended $2,500 advertising budget, your typical total investment is $5,000 per month: $2,500 for Customers.Direct and $2,500 paid directly to Meta.",
  },
  {
    q: "How many customer DMs could I receive?",
    a: "Based on an illustrative cost of $5–$10 per customer conversation, a $2,500 advertising budget could generate approximately 250–500 DMs. Actual results vary by industry, location, audience, offer and campaign performance. Results are not guaranteed.",
  },
  {
    q: "Where do the customer messages go?",
    a: "Interested customers message your business directly through your existing Instagram or Facebook inbox. You control the conversation and respond from your own account.",
  },
  {
    q: "Who responds to the customer?",
    a: "You or someone on your team responds, answers questions and closes the customer. Customers.Direct creates and manages the advertising that starts the conversation.",
  },
  {
    q: "Do you guarantee a certain number of leads or customers?",
    a: "No. Advertising performance varies, so we do not guarantee a specific number of conversations, appointments or customers. We continually monitor and optimize the campaign for stronger performance.",
  },
  {
    q: "Do I need to sign a long-term contract?",
    a: "No long-term contract is required. The service is billed monthly. You can discuss timing, campaign expectations and cancellation details during your strategy call.",
  },
  {
    q: "What types of businesses is this best for?",
    a: "Customers.Direct is designed for service businesses where one new customer has meaningful value, including law firms, dental practices, med spas, roofing companies and real estate professionals.",
  },
  {
    q: "How do I get started?",
    a: "Book a free 30-minute strategy call, tell us about your business and choose your advertising budget. We will explain the recommended campaign and next steps.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number>(0);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  function toggle(i: number) {
    setOpen((prev) => (prev === i ? -1 : i));
  }

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-[900px] mx-auto">

        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] mb-4">
            Questions before getting started?
          </h2>
          <p className="text-base md:text-lg text-[#64748B] leading-relaxed">
            Everything you need to know about the service, advertising budget and customer conversations.
          </p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-3 mb-12">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl border transition-all duration-200"
                style={{
                  borderColor: isOpen ? "#BFDBFE" : "#F1F5F9",
                  boxShadow: isOpen
                    ? "0 4px 20px rgba(37,99,235,0.08)"
                    : "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                {/* Question row — full button */}
                <button
                  aria-expanded={isOpen}
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 rounded-2xl"
                >
                  <span className={`text-base font-bold leading-snug transition-colors duration-200 ${isOpen ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                    {faq.q}
                  </span>
                  {/* Icon */}
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                    style={{
                      background: isOpen ? "#EFF6FF" : "#F8FAFC",
                      color: isOpen ? "#2563EB" : "#94A3B8",
                    }}
                    aria-hidden="true"
                  >
                    {isOpen ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Answer — animated height */}
                <div
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{ maxHeight: isOpen ? "400px" : "0px" }}
                >
                  <p className="px-6 pb-6 text-[#475569] text-base leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <button
            onClick={() => scrollTo("strategy-call")}
            className="bg-[#2563EB] text-white font-bold px-10 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base shadow-lg hover:shadow-xl"
          >
            Book a Strategy Call
          </button>
        </div>

      </div>
    </section>
  );
}
