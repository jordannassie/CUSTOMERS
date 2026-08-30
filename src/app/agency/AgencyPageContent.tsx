"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, UserPlus, BarChart3, Lightbulb, FileText } from "lucide-react";
import AgencyWorkspaceDemo from "@/components/site/AgencyWorkspaceDemo";

// ─── Hero ──────────────────────────────────────────────────────────────────────

function AgencyHero() {
  return (
    <section className="bg-[#171717] overflow-hidden" aria-label="AI search analytics for marketing agencies">
      <div className="max-w-[1200px] mx-auto px-4 py-14 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left copy */}
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/50 bg-white/8 border border-white/12 px-3 py-1 rounded-full mb-5 uppercase tracking-wider">
              For Marketing Agencies
            </div>
            <h1 className="text-[32px] sm:text-[40px] lg:text-[46px] font-black text-white leading-[1.1] tracking-tight mb-5">
              AI search analytics for marketing agencies
            </h1>
            <p className="text-[16px] sm:text-[17px] text-white/55 leading-relaxed mb-8 max-w-[480px]">
              Track, analyze, and improve your clients&apos; visibility across AI search platforms. Compare competitors, uncover actionable improvements, and deliver client-ready reports — all from one dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-white text-[#171717] font-bold px-6 py-3 rounded-full hover:bg-[#F5F5F2] transition-all shadow-lg hover:-translate-y-px text-[14px] active:scale-[0.97]"
              >
                Start Your Agency Trial <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link
                href="/contact?topic=agency"
                className="inline-flex items-center gap-2 border border-white/25 text-white/80 font-semibold px-6 py-3 rounded-full hover:bg-white/8 transition-all text-[14px] active:scale-[0.97]"
              >
                Talk to Sales
              </Link>
            </div>
            <p className="text-[11.5px] text-white/30 mt-4">
              14-day free trial · Credit card required · Paid subscription begins after trial
            </p>
          </div>

          {/* Right — animated dashboard demo */}
          <AgencyWorkspaceDemo />
        </div>
      </div>
    </section>
  );
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  {
    icon: UserPlus,
    title: "Add your clients",
    body: "Create a workspace for each client's website, competitors, and tracked prompts.",
    color: "#2563EB",
  },
  {
    icon: BarChart3,
    title: "Track their competition",
    body: "See where clients appear in AI answers and which competitors appear alongside or ahead of them.",
    color: "#7C3AED",
  },
  {
    icon: Lightbulb,
    title: "Turn insights into action",
    body: "Use evidence-based recommendations and ready-to-use Claude prompts to help your team improve client websites.",
    color: "#059669",
  },
  {
    icon: FileText,
    title: "Deliver clear reports",
    body: "Generate client-ready PDF reports and track visibility changes over time.",
    color: "#EA580C",
  },
];

function WorkflowSection() {
  return (
    <section className="bg-[#FAFAF8] py-16 sm:py-20 px-4">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-black text-[#171717] leading-tight tracking-tight mb-3">
            A repeatable AEO workflow for every client.
          </h2>
          <p className="text-[15px] text-[#777773] max-w-xl mx-auto">
            Four steps from onboarding to client-ready report. Repeat for every brand you manage.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step.title} className="bg-white rounded-2xl border border-[#E5E5E1] p-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${step.color}18` }}
                >
                  <step.icon size={17} style={{ color: step.color }} aria-hidden="true" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0]">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-[#171717] leading-snug">{step.title}</h3>
              <p className="text-[13px] text-[#777773] leading-relaxed flex-1">{step.body}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-[#B0B0A8] mt-8 max-w-lg mx-auto leading-relaxed">
          Customers.Direct identifies improvements and provides Direct Agent guidance and Claude implementation prompts. Autonomous website changes are not part of the current product.
        </p>
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

function RevenueSection() {
  return (
    <section className="bg-white py-16 sm:py-20 px-4">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-black text-[#171717] leading-tight tracking-tight mb-3">
            What your AEO service could generate
          </h2>
          <p className="text-[15px] text-[#777773] max-w-2xl mx-auto">
            Choose your own service pricing and packages. These examples show how monthly client retainers could add up.
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
                  <th scope="col" className="pb-6 pt-5 px-3 text-center relative">
                    <div className="bg-[#EFF6FF] rounded-xl px-4 py-3 border-2 border-[#2563EB] relative">
                      <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                        <span className="bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full whitespace-nowrap">
                          Example Package
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

        <p className="text-center text-[11px] text-[#A3A3A0] mt-6 max-w-lg mx-auto leading-relaxed">
          Illustrative gross agency revenue only — not profit or guaranteed earnings. Excludes Customers.Direct subscription fees and your service delivery costs.
        </p>
      </div>
    </section>
  );
}

// ─── Closing CTA ──────────────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section className="bg-[#FAFAF8] px-4 pb-24 pt-4">
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
              Grow your agency with AI search
            </p>
            <h2 className="text-[32px] sm:text-[44px] font-bold text-white leading-[1.1] tracking-tight mb-5">
              Your clients want to show up in AI.
              <br className="hidden sm:block" />
              Be the agency that helps them.
            </h2>
            <p className="text-[16px] text-white/75 max-w-[520px] mx-auto mb-4 leading-relaxed">
              Track your clients&apos; AI visibility against competitors, generate client-ready PDF reports, and turn findings into actionable website improvements with ready-to-use Claude prompts.
            </p>
            <p className="text-[15px] text-white/55 max-w-[440px] mx-auto mb-10 leading-relaxed">
              Bring your client accounts together and make AEO part of your agency&apos;s ongoing service.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="flex items-center gap-2 bg-white text-[#0866F5] font-bold px-7 py-3.5 rounded-full hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-px text-[15px] active:scale-[0.97]"
              >
                Start Your Agency Trial
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/contact?topic=agency"
                className="flex items-center gap-2 border border-white/30 text-white font-semibold px-6 py-3.5 rounded-full hover:bg-white/10 transition-all text-[14px] active:scale-[0.97]"
              >
                Talk to Sales
              </Link>
            </div>
            <p className="text-[12px] text-white/50 mt-6">
              14-day free trial · Credit card required · Paid subscription begins after trial
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AgencyPageContent() {
  return (
    <>
      <AgencyHero />
      <WorkflowSection />
      <RevenueSection />
      <ClosingCTA />
    </>
  );
}
