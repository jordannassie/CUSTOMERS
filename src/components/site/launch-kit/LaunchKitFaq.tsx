"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

const ITEMS = [
  {
    q: "Is this a monthly subscription?",
    a: "No. The Launch Kit is a one-time $97 payment.",
  },
  {
    q: "Do I need technical experience?",
    a: "No. The training is written for people who want to sell a service, not build software.",
  },
  {
    q: "Will this help me get real clients?",
    a: "It gives you the offer, scripts, and a first-client plan. Results depend on your effort, market, and sales.",
  },
  {
    q: "What if I am not satisfied?",
    a: "If it is not for you, you can ask for a full refund within 30 days.",
  },
  {
    q: "Do I get access to the software?",
    a: "The kit includes a live software walkthrough. Customers.Direct Agency software is available separately when you are ready to serve clients.",
  },
  {
    q: "Can I upgrade later?",
    a: "Yes. You can add Agency software later. Buying the kit does not start a monthly subscription.",
  },
];

export default function LaunchKitFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="rounded-2xl border border-[#E5E5E1] bg-white p-5 sm:p-6 shadow-[0_8px_24px_rgba(23,23,23,0.06)] h-full">
      <h2 className="text-[20px] font-bold text-[#171717]">Frequently asked questions</h2>
      <div className="mt-4 divide-y divide-[#E5E5E1]">
        {ITEMS.map((item, index) => {
          const isOpen = open === index;
          return (
            <div key={item.q}>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-3 py-3.5 text-left"
                onClick={() => setOpen(isOpen ? null : index)}
                aria-expanded={isOpen}
              >
                <span className="text-[14px] font-medium text-[#171717]">{item.q}</span>
                {isOpen ? (
                  <Minus size={16} className="text-[#6B6B67] shrink-0" />
                ) : (
                  <Plus size={16} className="text-[#6B6B67] shrink-0" />
                )}
              </button>
              {isOpen ? (
                <p className="pb-3.5 text-[13px] leading-5 text-[#6B6B67]">{item.a}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
