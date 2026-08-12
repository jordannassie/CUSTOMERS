"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What is an AI Receptionist?",
    a: "An AI Receptionist is a voice-based assistant that answers your business phone, greets callers, responds to their questions, qualifies leads, sends booking links, and delivers a summary of the call back to you — all automatically.",
  },
  {
    q: "Can I keep my existing business number?",
    a: "In most cases, yes. Your existing business phone number can remain the number your customers call. We work with you to route calls appropriately so nothing about your business number needs to change for your customers.",
  },
  {
    q: "Can it answer calls after hours?",
    a: "Yes. Your AI Receptionist can be available 24 hours a day, including evenings, weekends, and holidays — so customers always get a response when they call, even when your team is unavailable.",
  },
  {
    q: "Can it schedule appointments?",
    a: "Yes. The AI Receptionist can send booking links during the conversation so callers can select a time that works for them. It can be configured around your scheduling process and tools.",
  },
  {
    q: "Can it qualify callers?",
    a: "Yes. The AI Receptionist can ask the qualifying questions that matter to your business — such as service type, location, urgency, budget, or preferred timing — before passing the lead to your team.",
  },
  {
    q: "Will I know what happened during the call?",
    a: "Yes. After every call, your team receives a summary that includes who called, what they were looking for, any urgency, and what the AI said or did during the conversation.",
  },
  {
    q: "Can it answer questions about my specific business?",
    a: "Yes. Your AI Receptionist is configured with your business information — services, hours, pricing, FAQs, and policies — so it can answer questions the way your business would. If a question falls outside what it knows, it can gather information, send a message, or let the caller know a team member will follow up.",
  },
  {
    q: "Does it support multiple languages?",
    a: "Yes. Your AI Receptionist can handle conversations in many languages, so customers who prefer to speak in a language other than English can still be helped.",
  },
  {
    q: "What happens if it doesn't know the answer?",
    a: "If the AI encounters a situation it cannot handle, it can be configured to gather the caller's information, send a relevant link, take a message, or let the caller know that a team member will follow up — based on your preferred workflow.",
  },
  {
    q: "How long does setup take?",
    a: "Setup time varies depending on the complexity of your business and call handling needs. We work through the configuration with you to make sure your AI Receptionist is ready before it goes live.",
  },
];

export default function AIFAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="bg-[#EFF6FF] py-24 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Headline */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] leading-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {FAQS.map(({ q, a }, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#DBEAFE] overflow-hidden"
                style={{ boxShadow: "0 1px 4px rgba(37,99,235,0.05)" }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-[#2563EB] focus-visible:rounded-2xl"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-[#0F172A] text-sm leading-snug">
                    {q}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-[#64748B] shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-[#64748B] leading-relaxed">{a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
