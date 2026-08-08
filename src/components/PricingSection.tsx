"use client";

export default function PricingSection() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="pricing" className="gradient-bg py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div>
            <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] mb-4">
              Simple, transparent pricing.
            </h2>
            <p className="text-lg text-[#64748B] leading-relaxed">
              High-performing video ads. Real conversations. More customers.
            </p>
          </div>

          {/* Right — Pricing Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            {/* Price */}
            <div className="mb-1">
              <span className="text-4xl font-black text-[#0F172A]">$2,500</span>
              <span className="text-lg font-semibold text-[#64748B] ml-1">/ month</span>
            </div>
            <p className="text-sm text-[#64748B] mb-6">Ad spend paid separately.</p>

            <hr className="border-gray-100 mb-6" />

            {/* Checkmarks */}
            <ul className="flex flex-col gap-3 mb-8">
              {[
                "Video ad creation",
                "Meta campaign management",
                "Leads sent to your DMs",
                "Ongoing campaign optimization",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[#0F172A]">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={() => scrollTo("strategy-call")}
              className="w-full bg-[#2563EB] text-white font-bold py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-base"
            >
              Book a Strategy Call
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
