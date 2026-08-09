"use client";

// ─────────────────────────────────────────────────────────────────────────────
// WhyDMsSection — Meta research proof section
// ─────────────────────────────────────────────────────────────────────────────

const STATS = [
  {
    number: "71%",
    detail:
      "Want the ability to message a business immediately after clicking a social media ad.",
  },
  {
    number: "1 BILLION",
    detail:
      "People message businesses every week across Meta platforms.",
  },
  {
    number: "600 MILLION",
    detail:
      "Conversations happen between people and businesses every day across Meta technologies.",
  },
];

export default function WhyDMsSection() {
  return (
    <section className="bg-white py-24 px-4 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">

        {/* Eyebrow */}
        <p className="text-xs font-black uppercase tracking-widest text-[#2563EB] mb-6">
          Why DMs?
        </p>

        {/* Headline */}
        <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-[#0F172A] leading-none tracking-tight mb-6">
          62% MORE<br />LEADS
        </h2>

        {/* Supporting copy */}
        <p className="text-lg md:text-xl text-[#475569] leading-relaxed max-w-2xl mb-14">
          Businesses using Meta Business Messaging generated{" "}
          <strong className="text-[#0F172A]">62% more leads on average</strong>{" "}
          compared with legacy channels like websites, email and phone.*
        </p>

        {/* Flow line — AD → DM → CONVERSATION */}
        <div className="flex items-center gap-3 sm:gap-5 mb-16 overflow-x-auto pb-1">
          {["AD", "DM", "CONVERSATION"].map((label, i) => (
            <div key={label} className="flex items-center gap-3 sm:gap-5 shrink-0">
              <div className="px-5 sm:px-8 py-3 sm:py-4 rounded-xl border-2 border-[#0F172A] bg-white">
                <span className="text-sm sm:text-base font-black tracking-wider text-[#0F172A]">
                  {label}
                </span>
              </div>
              {i < 2 && (
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-[#2563EB] shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* 3 stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14">
          {STATS.map(({ number, detail }) => (
            <div
              key={number}
              className="rounded-2xl border border-gray-200 bg-white px-7 py-8"
            >
              <p className="text-3xl sm:text-4xl font-black text-[#0F172A] mb-4 leading-none">
                {number}
              </p>
              <p className="text-base text-[#475569] leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>

        {/* Bottom copy */}
        <p className="text-base md:text-lg text-[#475569] leading-relaxed max-w-3xl mb-6">
          Messaging lets businesses qualify and re-engage leads inside the
          existing conversation — without forcing prospects to switch to email,
          forms or phone calls.
        </p>

        {/* Source */}
        <p className="text-sm text-[#94A3B8]">
          *Source: Meta Business Messaging / Meta Lead Ads with Messaging research.{" "}
          <a
            href="https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-messaging"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563EB] underline underline-offset-2 hover:text-[#1d4ed8] transition-colors"
          >
            View Meta research
          </a>
        </p>

      </div>
    </section>
  );
}
