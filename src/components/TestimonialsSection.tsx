const TESTIMONIALS = [
  {
    stars: 5,
    quote:
      "We used to miss calls every afternoon when the team was on jobs. Now every call gets answered and I get a full summary. I&apos;ve booked 4 new clients this month I never would have talked to.",
    name: "Derek Thompson",
    business: "Thompson Plumbing",
    initials: "DT",
    color: "#2563EB",
  },
  {
    stars: 5,
    quote:
      "My weekends used to be calls and admin. Now they&apos;re actually mine. The AI books consultations while I&apos;m on shoots. Saturdays are finally mine again.",
    name: "Hannah Brooks",
    business: "Brooks Wedding Photography",
    initials: "HB",
    color: "#7C3AED",
  },
  {
    stars: 5,
    quote:
      "It picks up at 2am. It picks up Sunday. It picked up while I was at my kid&apos;s soccer game. Three months in, zero missed leads.",
    name: "Janet Cole",
    business: "Cole Cleaning Services",
    initials: "JC",
    color: "#0891B2",
  },
  {
    stars: 5,
    quote:
      "I rewrote the AI&apos;s tone to be warm and a little funny — just like our front desk. Callers comment on how helpful it is. They don&apos;t even realize it&apos;s AI.",
    name: "Marcus Rivera",
    business: "Rivera Auto",
    initials: "MR",
    color: "#059669",
  },
  {
    stars: 5,
    quote:
      "By the time a lead hits my inbox I already know the caller&apos;s name, what they need, and how urgent it is. I call back with context. It&apos;s a totally different conversation.",
    name: "Brandon Lee",
    business: "Lee Insurance Group",
    initials: "BL",
    color: "#DC2626",
  },
  {
    stars: 5,
    quote:
      "We run Google Ads and used to lose leads when nobody picked up. Since setting this up, our contact rate went up 40%. Same ad spend, way more conversations.",
    name: "Priya Nair",
    business: "Nair MedSpa",
    initials: "PN",
    color: "#9333EA",
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
          {TESTIMONIALS.map(({ stars, quote, name, business, initials, color }) => (
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
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
                  style={{ background: color }}
                >
                  {initials}
                </div>
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
