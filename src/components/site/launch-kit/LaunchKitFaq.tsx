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
    <div className="rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-[0_8px_24px_rgba(23,23,23,0.06)] h-full">
      <h2 className="text-[length:calc(20px*var(--px,1))] font-bold text-foreground">Frequently asked questions</h2>
      <div className="mt-4 divide-y divide-border">
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
                <span className="text-[length:calc(14px*var(--px,1))] font-medium text-foreground">{item.q}</span>
                {isOpen ? (
                  <Minus size={16} className="text-muted-foreground shrink-0" />
                ) : (
                  <Plus size={16} className="text-muted-foreground shrink-0" />
                )}
              </button>
              {isOpen ? (
                <p className="pb-3.5 text-[length:calc(13px*var(--px,1))] leading-5 text-muted-foreground">{item.a}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
