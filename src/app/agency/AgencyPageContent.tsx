"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// ─── Hero Banner ──────────────────────────────────────────────────────────────

const AGENCY_BANNERS = [
  {
    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/banners/banner2/ChatGPT%20Image%20Aug%2026,%202026,%2012_44_50%20PM%20(5).png",
    alt: "Auto service client gets a booking through Google AI",
    industry: "Auto Service",
    platform: "Google AI",
  },
  {
    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/banners/banner2/ChatGPT%20Image%20Aug%2026,%202026,%2012_44_50%20PM%20(8).png",
    alt: "Retail shopper books a product demo through ChatGPT",
    industry: "Retail",
    platform: "ChatGPT",
  },
  {
    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/banners/banner2/ChatGPT%20Image%20Aug%2026,%202026,%2012_44_50%20PM%20(3).png",
    alt: "Restaurant family places dinner order through ChatGPT",
    industry: "Restaurant",
    platform: "ChatGPT",
  },
];

function AgencyHeroBanner() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % AGENCY_BANNERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const banner = AGENCY_BANNERS[active];

  return (
    <section className="bg-[#171717] overflow-hidden" aria-label="We help your agency run AEO">
      <div className="text-center px-4 pt-12 pb-8">
        <h1 className="text-[28px] sm:text-[38px] lg:text-[46px] font-black text-white leading-tight tracking-tight max-w-3xl mx-auto">
          We help your Agency run AEO
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px] text-white/55 max-w-xl mx-auto">
          Answer Engine Optimization for every client — tracked, measured, and billed as a recurring service.
        </p>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 pb-10">
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active}
            src={banner.src}
            alt={banner.alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
            <span className="text-[11px] font-semibold text-white/90">{banner.industry}</span>
            <span className="text-white/30 text-[10px]">·</span>
            <span className="text-[11px] text-white/60">{banner.platform}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-5">
          {AGENCY_BANNERS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show slide ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width: i === active ? 24 : 8,
                height: 8,
                background: i === active ? "#FFFFFF" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Revenue Matrix ───────────────────────────────────────────────────────────

const REVENUE_ROWS = [
  { clients: 5,   low: "$1,495",  mid: "$2,495",  high: "$3,750"  },
  { clients: 10,  low: "$2,990",  mid: "$4,990",  high: "$7,500"  },
  { clients: 25,  low: "$7,475",  mid: "$12,475", high: "$18,750" },
  { clients: 50,  low: "$14,950", mid: "$24,950", high: "$37,500" },
  { clients: 100, low: "$29,900", mid: "$49,900", high: "$75,000" },
];

export default function AgencyPageContent() {
  return (
    <>
      <AgencyHeroBanner />

      <div className="bg-[#FAFAF8]">
        <section className="w-full py-20 sm:py-28 px-4">
          <div className="max-w-[1200px] mx-auto">

            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#171717] leading-tight tracking-tight mb-4">
                Turn AI Visibility Into Recurring Revenue
              </h2>
              <p className="text-base text-[#777773] max-w-xl mx-auto">
                Customers.Direct gives you the platform. You choose what to charge your clients.
              </p>
            </div>

            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[520px] max-w-3xl mx-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="text-left pb-6 pr-6 text-[11px] font-bold uppercase tracking-widest text-[#A3A3A0] w-28"
                      >
                        Active<br />Clients
                      </th>
                      <th scope="col" className="pb-6 px-3 text-center">
                        <div className="bg-[#F5F5F2] rounded-xl px-4 py-3 border border-[#E5E5E1]">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-1">Per Client</div>
                          <div className="text-lg font-black text-[#171717]">
                            $299<span className="text-sm font-semibold text-[#A3A3A0]">/mo</span>
                          </div>
                        </div>
                      </th>
                      <th scope="col" className="pb-6 px-3 text-center relative">
                        <div className="bg-[#EFF6FF] rounded-xl px-4 py-3 border-2 border-[#2563EB] relative">
                          <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                            <span className="bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full whitespace-nowrap">
                              Sweet Spot
                            </span>
                          </div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] mb-1">Per Client</div>
                          <div className="text-lg font-black text-[#2563EB]">
                            $499<span className="text-sm font-semibold text-[#2563EB]/60">/mo</span>
                          </div>
                        </div>
                      </th>
                      <th scope="col" className="pb-6 px-3 text-center">
                        <div className="bg-[#F5F5F2] rounded-xl px-4 py-3 border border-[#E5E5E1]">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0] mb-1">Per Client</div>
                          <div className="text-lg font-black text-[#171717]">
                            $750<span className="text-sm font-semibold text-[#A3A3A0]">/mo</span>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {REVENUE_ROWS.map(({ clients, low, mid, high }, i) => (
                      <tr key={clients} className={i % 2 === 0 ? "bg-[#FAFAF8]" : "bg-white"}>
                        <td className="py-4 pr-6 text-sm font-bold text-[#171717] pl-3 rounded-l-xl">
                          {clients} clients
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="text-sm font-semibold text-[#555552] tabular-nums">{low}/mo</span>
                        </td>
                        <td className="py-4 px-3 text-center bg-[#EFF6FF] border-x border-[#BFDBFE]">
                          <span className="text-sm font-black text-[#2563EB] tabular-nums">{mid}/mo</span>
                        </td>
                        <td className="py-4 px-3 text-center rounded-r-xl">
                          <span className="text-sm font-semibold text-[#555552] tabular-nums">{high}/mo</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-center text-xs text-[#A3A3A0] mt-6 max-w-md mx-auto leading-relaxed">
              Illustrative agency revenue only. You choose your own pricing, services and packages.
            </p>

          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="px-4 pb-24">
          <div className="max-w-[900px] mx-auto">
            <div
              className="rounded-3xl overflow-hidden relative text-center px-8 py-16 sm:py-20"
              style={{ background: "linear-gradient(110deg, #063B9D 0%, #0866F5 55%, #168BFF 100%)" }}
            >
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 100%)",
                }}
                aria-hidden="true"
              />
              <div className="relative z-10">
                <p className="text-[13px] font-bold uppercase tracking-widest text-white/60 mb-4">
                  Get started today
                </p>
                <h2 className="text-[32px] sm:text-[44px] font-bold text-white leading-[1.1] tracking-tight mb-5">
                  See where customers are finding
                  <br className="hidden sm:block" />
                  your competitors.
                </h2>
                <p className="text-[16px] text-white/75 max-w-[480px] mx-auto mb-10 leading-relaxed">
                  Join free during beta and discover exactly how your business appears across AI
                  search and Google — no credit card, no time limit.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/signup"
                    className="flex items-center gap-2 bg-white text-[#0866F5] font-bold px-7 py-3.5 rounded-full hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-px text-[15px] active:scale-[0.97]"
                  >
                    Start Free
                    <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/contact?topic=enterprise"
                    className="flex items-center gap-2 border border-white/30 text-white font-semibold px-6 py-3.5 rounded-full hover:bg-white/10 transition-all text-[14px] active:scale-[0.97]"
                  >
                    Talk to Sales
                  </Link>
                </div>
                <p className="text-[12px] text-white/50 mt-6">
                  Free during beta · No credit card required · Full product access
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
