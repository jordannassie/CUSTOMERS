"use client";

// ─────────────────────────────────────────────────────────────────────────────
// LogosBanner
// "Businesses we've helped with Customer Acquisition"
// Replace the src values below with real logo URLs when available.
// ─────────────────────────────────────────────────────────────────────────────

const LOGOS = [
  { name: "Luxe Aesthetics",   abbr: "LA" },
  { name: "Peak Fitness",      abbr: "PF" },
  { name: "Glow Skincare",     abbr: "GS" },
  { name: "Nova Real Estate",  abbr: "NR" },
  { name: "Apex Auto",         abbr: "AA" },
  { name: "Ember Coffee",      abbr: "EC" },
  { name: "Stride Apparel",    abbr: "SA" },
  { name: "Vertex Dental",     abbr: "VD" },
];

export default function LogosBanner() {
  return (
    <section className="bg-white pt-6 pb-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Label */}
        <p className="text-center text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-8">
          Businesses we&apos;ve helped with customer acquisition
        </p>

        {/* Logo grid — wraps on mobile, single row on desktop */}
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-6">
          {LOGOS.map(({ name, abbr }) => (
            <div
              key={name}
              title={name}
              className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity group"
            >
              {/* Logo placeholder circle — swap with <img> when you have real logos */}
              <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center shrink-0">
                <span className="text-[10px] font-black text-[#64748B]">{abbr}</span>
              </div>
              <span className="text-sm font-bold text-[#64748B] whitespace-nowrap">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
