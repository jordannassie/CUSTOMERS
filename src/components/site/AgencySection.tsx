import Link from "next/link";
import { ArrowRight, Building2, FileBarChart, Users, Shield, ChevronRight } from "lucide-react";

const FEATURES = [
  {
    icon: Building2,
    label: "Multiple clients, one login",
    desc: "Manage every client business from a single agency account with instant business-switching.",
  },
  {
    icon: FileBarChart,
    label: "White-label reports",
    desc: "Share branded reports with your agency logo — your clients see your brand, not ours.",
  },
  {
    icon: Users,
    label: "Per-client subscriptions",
    desc: "Each business has separate scans, analytics, and billing — billed to your agency.",
  },
  {
    icon: Shield,
    label: "You own the client relationship",
    desc: "Customers.Direct bills your agency. What you charge clients is entirely your business.",
  },
] as const;

export default function AgencySection() {
  return (
    <section id="agency" className="bg-[#0F172A] py-20 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 text-white/70 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
              For Agencies
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-[1.08] tracking-tight mb-5">
              Run AI visibility for{" "}
              <span className="text-[#60A5FA]">every client</span>{" "}
              from one account.
            </h2>
            <p className="text-base text-white/55 leading-relaxed mb-10">
              One login. Multiple client businesses. Separate scans, scores and reports per client. White-label delivery with your agency branding.
            </p>

            <div className="flex flex-col gap-5 mb-10">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white/8 border border-white/12 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-white/60" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">{label}</p>
                    <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#1d4ed8] transition-colors text-sm"
            >
              Explore Agency Solutions
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {/* Right: Business switcher mock */}
          <div>
            <div
              className="bg-[#1E293B] rounded-2xl border border-white/10 overflow-hidden"
              style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}
            >
              <div className="px-5 py-4 border-b border-white/8">
                <p className="text-[10px] uppercase tracking-wider font-bold text-white/25 mb-2">
                  Your Businesses
                </p>
                <div className="bg-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between border border-white/8">
                  <span className="text-sm font-semibold text-white">
                    Client A — autoshop.com
                  </span>
                  <ChevronRight size={14} className="text-white/25" />
                </div>
              </div>

              <div className="p-2">
                {[
                  { name: "Client A — autoshop.com", score: "42%", delta: "+8", active: true },
                  { name: "Client B — dentist.com", score: "61%", delta: "+3", active: false },
                  { name: "Client C — lawfirm.com", score: "28%", delta: "+14", active: false },
                  { name: "Client D — plumber.com", score: "19%", delta: "+2", active: false },
                ].map(({ name, score, delta, active }) => (
                  <div
                    key={name}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      active ? "bg-[#2563EB]/20" : "hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        active ? "bg-[#2563EB] text-white" : "bg-white/10 text-white/35"
                      }`}
                    >
                      {name[0]}
                    </div>
                    <span className="text-xs font-medium text-white/65 flex-1 truncate">
                      {name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-bold text-white/55">{score}</span>
                      <span className="text-[10px] font-bold text-emerald-400">{delta}</span>
                    </div>
                  </div>
                ))}
                <div className="mt-1 border-t border-white/8 pt-2 px-3 py-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg border border-dashed border-white/20 flex items-center justify-center shrink-0">
                    <span className="text-white/30 text-lg leading-none">+</span>
                  </div>
                  <span className="text-xs text-white/30">Add client business</span>
                </div>
              </div>

              <div className="border-t border-white/8 px-5 py-3 flex items-center justify-between">
                <span className="text-[10px] text-white/25">4 businesses · Agency plan</span>
                <span className="text-[10px] font-semibold text-[#60A5FA]">
                  White-label enabled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
