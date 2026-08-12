"use client";

import { useState } from "react";

const TESTIMONIALS = [
  {
    stars: 5,
    quote:
      "We used to miss calls every afternoon when the team was on jobs. Now every call gets answered and I get a full summary. I've booked 4 new clients this month I never would have talked to.",
    name: "Derek Thompson",
    business: "Thompson Plumbing",
    initials: "DT",
    color: "#2563EB",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face&auto=format",
  },
  {
    stars: 5,
    quote:
      "My weekends used to be calls and admin. Now they're actually mine. The AI books consultations while I'm on shoots. Saturdays are finally mine again.",
    name: "Hannah Brooks",
    business: "Brooks Wedding Photography",
    initials: "HB",
    color: "#7C3AED",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face&auto=format",
  },
  {
    stars: 5,
    quote:
      "It picks up at 2am. It picks up Sunday. It picked up while I was at my kid's soccer game. Three months in, zero missed leads.",
    name: "Janet Cole",
    business: "Cole Cleaning Services",
    initials: "JC",
    color: "#0891B2",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=face&auto=format",
  },
  {
    stars: 5,
    quote:
      "I rewrote the AI's tone to be warm and a little funny — just like our front desk. Callers comment on how helpful it is. They don't even realize it's AI.",
    name: "Marcus Rivera",
    business: "Rivera Auto",
    initials: "MR",
    color: "#059669",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face&auto=format",
  },
  {
    stars: 5,
    quote:
      "By the time a lead hits my inbox I already know the caller's name, what they need, and how urgent it is. I call back with context. It's a totally different conversation.",
    name: "Brandon Lee",
    business: "Lee Insurance Group",
    initials: "BL",
    color: "#DC2626",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face&auto=format",
  },
  {
    stars: 5,
    quote:
      "We run Google Ads and used to lose leads when nobody picked up. Since setting this up, our contact rate went up 40%. Same ad spend, way more conversations.",
    name: "Priya Nair",
    business: "Nair MedSpa",
    initials: "PN",
    color: "#9333EA",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=face&auto=format",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5 mb-4" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#FBBF24" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function Avatar({
  photo,
  name,
  initials,
  color,
}: {
  photo: string;
  name: string;
  initials: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
        style={{ background: color }}
        aria-label={name}
      >
        {initials}
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={photo}
      alt={name}
      width={40}
      height={40}
      onError={() => setFailed(true)}
      className="w-10 h-10 rounded-full object-cover shrink-0"
      style={{ border: `2px solid ${color}20` }}
    />
  );
}

export default function TestimonialsSection() {
  return (
    <section className="bg-[#F0F4FF] py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight">
            Business owners love Customers.Direct.
          </h2>
          <p className="text-base text-[#64748B] mt-4 max-w-lg mx-auto">
            Real results from real businesses that stopped missing calls and started capturing more customers.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map(({ stars, quote, name, business, initials, color, photo }) => (
            <div
              key={name}
              className="bg-white rounded-2xl p-6 flex flex-col gap-4"
              style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
            >
              <Stars count={stars} />
              <p className="text-[#334155] text-sm leading-relaxed flex-1">
                &ldquo;{quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
                <Avatar photo={photo} name={name} initials={initials} color={color} />
                <div>
                  <p className="font-bold text-[#0F172A] text-sm leading-tight">{name}</p>
                  <p className="text-xs text-[#64748B]">{business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
