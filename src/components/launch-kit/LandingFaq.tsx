"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQ = [
  {
    q: "Do I need coding experience?",
    a: "No. The program is written for people who want to sell a service, not build software.",
  },
  {
    q: "Do I need an existing agency?",
    a: "No. You can start with one niche and one city, then add clients as you go.",
  },
  {
    q: "Is the $97 charge monthly?",
    a: "No. It is a one-time payment for the Launch Kit and Academy access.",
  },
  {
    q: "Is Customers.Direct included?",
    a: "The Launch Kit teaches you the business. Agency software is activated separately for $199/month.",
  },
  {
    q: "Can I use my own name and brand?",
    a: "Yes. You are building your own AI visibility business. Customers.Direct is the software you can use to run reports.",
  },
];

export default function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-t border-[#E5E5E1] bg-[#FAFAF8]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-[#171717]">
          Frequently asked questions
        </h2>
        <div className="mt-8 divide-y divide-[#E5E5E1] border border-[#E5E5E1] rounded-[4px] bg-white">
          {FAQ.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpen(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-medium text-[#171717]">{item.q}</span>
                  {isOpen ? (
                    <Minus size={16} className="text-[#6B6B67] shrink-0" />
                  ) : (
                    <Plus size={16} className="text-[#6B6B67] shrink-0" />
                  )}
                </button>
                {isOpen ? (
                  <p className="px-5 pb-5 text-[14px] leading-6 text-[#6B6B67]">{item.a}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
