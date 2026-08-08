"use client";

// ─── Cost matrix data ─────────────────────────────────────────────────────────

const ROWS = [
  {
    adSpend: "$1,500",
    daily: "$50/day",
    service: "$2,500",
    total: "$4,000/mo",
    dms: "150–300",
    recommended: false,
  },
  {
    adSpend: "$2,500",
    daily: "$83/day",
    service: "$2,500",
    total: "$5,000/mo",
    dms: "250–500",
    recommended: true,
  },
  {
    adSpend: "$5,000",
    daily: "$167/day",
    service: "$2,500",
    total: "$7,500/mo",
    dms: "500–1,000",
    recommended: false,
  },
  {
    adSpend: "$10,000",
    daily: "$333/day",
    service: "$2,500",
    total: "$12,500/mo",
    dms: "1,000–2,000",
    recommended: false,
  },
];

const COLS = [
  { key: "adSpend", label: "Meta Ad Spend" },
  { key: "daily",   label: "Daily Ad Spend" },
  { key: "service", label: "Our Service" },
  { key: "total",   label: "Total Investment" },
  { key: "dms",     label: "Est. Customer DMs" },
] as const;

// ─── Main section ─────────────────────────────────────────────────────────────

export default function PricingSection() {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="pricing" className="gradient-bg py-20 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-16">

        {/* ══ COST MATRIX ══════════════════════════════════════════════════════ */}
        <div>
          {/* Heading */}
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-[#0F172A] mb-3">
              See your complete customer-acquisition cost.
            </h2>
            <p className="text-base md:text-lg text-[#64748B] leading-relaxed max-w-2xl mx-auto">
              Our service stays at $2,500 per month. Choose how much you want to invest directly into Meta advertising.
            </p>
          </div>

          {/* ── Desktop table (md+) ── */}
          <div className="hidden md:block bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {COLS.map((col) => (
                    <th
                      key={col.key}
                      className="text-left px-6 py-4 text-xs font-bold text-[#64748B] uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr
                    key={row.adSpend}
                    className={`border-b last:border-b-0 transition-colors ${
                      row.recommended
                        ? "bg-[#EFF6FF] border-b border-blue-100"
                        : "hover:bg-gray-50"
                    }`}
                    style={row.recommended ? { outline: "2px solid #BFDBFE", outlineOffset: "-1px" } : {}}
                  >
                    {/* Meta Ad Spend */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-base text-[#0F172A]">{row.adSpend}</span>
                        {row.recommended && (
                          <span className="bg-[#2563EB] text-white text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Daily */}
                    <td className="px-6 py-5 text-[#64748B] font-medium">{row.daily}</td>
                    {/* Our Service — always $2,500 */}
                    <td className="px-6 py-5">
                      <span className="font-bold text-[#2563EB]">{row.service}</span>
                    </td>
                    {/* Total Investment */}
                    <td className="px-6 py-5">
                      <span className="font-black text-lg text-[#0F172A]">{row.total}</span>
                    </td>
                    {/* Est. DMs */}
                    <td className="px-6 py-5">
                      <span className={`font-black text-lg ${row.recommended ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                        {row.dms}
                      </span>
                      <div className="text-[10px] text-[#94A3B8] font-medium mt-0.5">conversations/mo*</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards (below md) ── */}
          {/* Recommended first, then rest */}
          <div className="md:hidden flex flex-col gap-4 mb-4">
            {[...ROWS].sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0)).map((row) => (
              <div
                key={row.adSpend}
                className={`rounded-2xl border p-5 ${
                  row.recommended
                    ? "bg-[#EFF6FF] border-[#BFDBFE] shadow-md"
                    : "bg-white border-gray-100 shadow-sm"
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xl text-[#0F172A]">{row.adSpend}</span>
                    <span className="text-sm text-[#64748B]">Meta ad spend</span>
                  </div>
                  {row.recommended && (
                    <span className="bg-[#2563EB] text-white text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-[#94A3B8] font-medium mb-0.5">Daily ad spend</div>
                    <div className="font-semibold text-[#0F172A]">{row.daily}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94A3B8] font-medium mb-0.5">Our service</div>
                    <div className="font-bold text-[#2563EB]">{row.service}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94A3B8] font-medium mb-0.5">Total investment</div>
                    <div className="font-black text-lg text-[#0F172A]">{row.total}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94A3B8] font-medium mb-0.5">Est. customer DMs*</div>
                    <div className={`font-black text-lg ${row.recommended ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                      {row.dms}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footnotes */}
          <div className="flex flex-col gap-1.5 mb-8">
            <p className="text-sm text-[#64748B]">
              Meta ad spend is paid separately and directly to Meta.
            </p>
            <p className="text-xs text-[#94A3B8] leading-relaxed max-w-3xl">
              * DM estimates are based on a typical $5–$10 cost per customer conversation.
              Results vary by industry, market, offer and campaign performance. Results are not guaranteed.
            </p>
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

        {/* ══ EXISTING PRICING CARD ════════════════════════════════════════════ */}
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
            <div className="mb-1">
              <span className="text-4xl font-black text-[#0F172A]">$2,500</span>
              <span className="text-lg font-semibold text-[#64748B] ml-1">/ month</span>
            </div>
            <p className="text-sm text-[#64748B] mb-6">Ad spend paid separately.</p>

            <hr className="border-gray-100 mb-6" />

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
