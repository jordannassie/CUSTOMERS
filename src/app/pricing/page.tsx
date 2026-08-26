"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check, Minus, ChevronDown, ArrowRight, Building2, Plus,
  BarChart3, Eye, Wrench, TrendingUp, Shield, Zap,
} from "lucide-react";
import SiteFooter from "@/components/site/SiteFooter";
import { ORDERED_PRICING_PLANS, COMPARISON_TABLE } from "@/config/pricing";
import type { PricingPlan } from "@/config/pricing";

// ─── Metadata is exported from a sibling layout or separate metadata.ts ─────
// (This page is "use client" for FAQ accordion; metadata moved to layout.)

const LOGO = "/images/logos/logo-black.png";
const NAV_GRADIENT = "linear-gradient(110deg, #063B9D 0%, #0866F5 55%, #168BFF 100%)";

// ─── Shared design tokens ─────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, { ring: string; badge: string; cta: string; ctaText: string }> = {
  starter: {
    ring: "border-[#E5E5E1]",
    badge: "",
    cta: "bg-white border border-[#E5E5E1] text-[#171717] hover:bg-[#F5F5F2] hover:border-[#D4D4CF]",
    ctaText: "",
  },
  growth: {
    ring: "border-[#0866F5]",
    badge: "bg-[#0866F5] text-white",
    cta: "bg-[#0866F5] text-white hover:bg-[#063B9D] shadow-lg shadow-blue-500/25",
    ctaText: "",
  },
  pro: {
    ring: "border-[#171717]",
    badge: "",
    cta: "bg-[#171717] text-white hover:bg-[#2A2A2A]",
    ctaText: "",
  },
  enterprise: {
    ring: "border-[#E5E5E1]",
    badge: "",
    cta: "bg-white border border-[#E5E5E1] text-[#171717] hover:bg-[#F5F5F2]",
    ctaText: "",
  },
};

// ─── Cell renderer for comparison table ──────────────────────────────────────

function Cell({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check size={16} className="text-[#0866F5] mx-auto" aria-label="Included" />;
  if (value === false)
    return <Minus size={14} className="text-[#D4D4CF] mx-auto" aria-label="Not included" />;
  return <span className="text-[13px] text-[#555552] font-medium">{value}</span>;
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: PricingPlan }) {
  const colors = PLAN_COLORS[plan.id];
  const isEnterprise = plan.id === "enterprise";

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 bg-white transition-shadow hover:shadow-xl ${colors.ring} ${
        plan.popular ? "shadow-xl shadow-blue-500/10 -translate-y-1" : "shadow-sm"
      }`}
    >
      {/* Most Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full ${colors.badge}`}>
            Most Popular
          </span>
        </div>
      )}

      <div className="p-7 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#A3A3A0]">
              {plan.positioning}
            </span>
          </div>
          <h3 className="text-[22px] font-bold text-[#171717] mb-1.5">{plan.name}</h3>
          <p className="text-[13px] text-[#777773] leading-snug">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="mb-5 pb-5 border-b border-[#F0F0EC]">
          {isEnterprise ? (
            <div>
              <p className="text-[36px] font-bold text-[#171717]">Custom</p>
              <p className="text-[12px] text-[#A3A3A0] mt-0.5">Contact us for pricing</p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[40px] font-bold text-[#171717]">{plan.priceLabel}</span>
                <span className="text-[14px] text-[#A3A3A0]">{plan.priceSuffix}</span>
              </div>
              <p className="text-[12px] text-[#059669] font-medium mt-1 flex items-center gap-1">
                <Shield size={11} />
                {plan.trialLabel} · No credit card
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="flex flex-col gap-2.5 mb-7 flex-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[13px] text-[#555552]">
              <Check size={14} className="text-[#0866F5] shrink-0 mt-0.5" aria-hidden="true" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto flex flex-col gap-2">
          <Link
            href={plan.ctaHref}
            className={`flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-[14px] font-semibold transition-all duration-150 active:scale-[0.97] ${colors.cta}`}
          >
            {plan.cta}
            <ArrowRight size={14} />
          </Link>
          {plan.secondaryCta && (
            <Link
              href={plan.secondaryCta.href}
              className="text-center text-[12px] text-[#777773] hover:text-[#171717] transition-colors py-1"
            >
              {plan.secondaryCta.label} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Comparison table ─────────────────────────────────────────────────────────

function ComparisonTable() {
  return (
    <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="min-w-[680px]">
        {/* Header */}
        <div className="grid grid-cols-5 gap-0 mb-2 sticky top-0 bg-white z-10 border-b border-[#EEEEEA]">
          <div className="py-3 pr-4" />
          {ORDERED_PRICING_PLANS.map((plan) => (
            <div key={plan.id} className="py-3 px-3 text-center">
              <p
                className={`text-[13px] font-bold ${
                  plan.popular ? "text-[#0866F5]" : "text-[#171717]"
                }`}
              >
                {plan.name}
              </p>
              {plan.priceMonthly > 0 && (
                <p className="text-[11px] text-[#A3A3A0] mt-0.5">{plan.priceLabel}/mo</p>
              )}
              {plan.id === "enterprise" && (
                <p className="text-[11px] text-[#A3A3A0] mt-0.5">Custom</p>
              )}
            </div>
          ))}
        </div>

        {/* Sections */}
        {COMPARISON_TABLE.map((section) => (
          <div key={section.section} className="mb-1">
            {/* Section header */}
            <div className="grid grid-cols-5 gap-0">
              <div className="col-span-5 py-3 px-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0]">
                  {section.section}
                </p>
              </div>
            </div>
            {/* Rows */}
            {section.rows.map((row, ri) => (
              <div
                key={row.feature}
                className={`grid grid-cols-5 gap-0 border border-[#F0F0EC] rounded-lg mb-0.5 ${
                  ri % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"
                }`}
              >
                <div className="py-3 px-4">
                  <p className="text-[12.5px] text-[#555552] font-medium">{row.feature}</p>
                </div>
                {(["starter", "growth", "pro", "enterprise"] as const).map((planId) => (
                  <div key={planId} className="py-3 px-3 flex items-center justify-center">
                    <Cell value={row[planId]} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Is Customers.Direct really free right now?",
    a: "Yes. The product is completely free during beta. Sign up, create businesses, add competitors, run scans, and use the full dashboard — no credit card, no time limit.",
  },
  {
    q: "When will paid plans start?",
    a: "We're testing the platform with early users before activating billing. We'll notify you well in advance before anything changes. Your data is always safe.",
  },
  {
    q: "Is pricing per business?",
    a: "Yes. When billing is introduced, each business workspace will have its own plan. One login can manage unlimited businesses — each with its own dashboard, competitors, scans, and data.",
  },
  {
    q: "What counts as a tracked AI search?",
    a: "A tracked search is a customer question or buying-intent prompt that Customers.Direct monitors across supported AI platforms such as ChatGPT, Claude, Perplexity, and Gemini.",
  },
  {
    q: "What happens to my data when billing starts?",
    a: "All your business data, scans, competitors, and history will remain. You'll be able to choose a paid plan that fits your needs — or we'll work something out.",
  },
  {
    q: "Can agencies use Customers.Direct?",
    a: "Yes. Agencies can manage multiple client businesses from one login. Each business gets its own dashboard, competitors, scans, and data. There is no separate agency plan — the multi-business architecture is built in.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. When billing is enabled, businesses can choose, upgrade, or downgrade plans independently.",
  },
  {
    q: "Does Customers.Direct actually fix my website?",
    a: "Customers.Direct identifies what needs to be fixed and provides Direct Agent guidance and Claude implementation prompts. Autonomous website changes are not part of the current product.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#EEEEEA] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
        aria-expanded={open}
      >
        <span className="text-[15px] font-semibold text-[#171717] group-hover:text-[#0866F5] transition-colors">
          {q}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#A3A3A0] shrink-0 mt-0.5 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <p className="pb-5 text-[14px] text-[#777773] leading-relaxed -mt-1">{a}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 py-3">
        <div
          className="max-w-[1200px] mx-auto rounded-[20px] px-5"
          style={{
            background: NAV_GRADIENT,
            boxShadow: "0 14px 32px rgba(6, 59, 157, 0.20), inset 0 1px 0 rgba(255,255,255,0.18)",
          }}
        >
          <div className="flex items-center h-[68px] gap-4">
            <Link href="/" aria-label="Customers.Direct — Home" className="shrink-0 mr-auto">
              <Image src={LOGO} alt="Customers.Direct" width={160} height={40} className="h-10 w-auto brightness-0 invert" priority />
            </Link>
            <Link href="/" className="hidden sm:inline text-[13px] text-white/80 hover:text-white transition-colors">
              Home
            </Link>
            <Link
              href="/login"
              className="text-[13px] font-medium text-white/80 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1.5 bg-white text-[#0866F5] text-[13px] font-semibold px-4 py-2 rounded-full hover:bg-blue-50 transition-all shadow-sm"
            >
              Join Free Beta <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Beta announcement banner ── */}
      <div className="px-4 pt-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-start gap-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl px-6 py-5">
            <Zap size={18} className="text-[#1D4ED8] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-[15px] font-bold text-[#1D4ED8] mb-1">
                Free during beta — no credit card required
              </p>
              <p className="text-[13px] text-[#1E40AF] leading-relaxed">
                Customers.Direct is currently free for early users while we finish testing the
                platform. Sign up, run scans, add competitors, and use the full dashboard — no
                payment or time limit. Paid plans will be introduced later and you&rsquo;ll be
                notified in advance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="pt-12 pb-8 px-4 text-center">
        <div className="max-w-[780px] mx-auto">
          <h1 className="text-[44px] sm:text-[58px] font-bold text-[#171717] leading-[1.05] tracking-tight mb-5">
            Know where customers
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: NAV_GRADIENT }}
            >
              can find you.
            </span>
          </h1>
          <p className="text-[18px] text-[#777773] leading-relaxed max-w-[560px] mx-auto mb-5">
            Track your visibility across AI search and Google, compare competitors, uncover
            opportunities, and let Customers.Direct help you improve.
          </p>
          <p className="text-[13px] font-semibold text-[#059669]">
            ✓ Free during beta &nbsp;·&nbsp; No credit card &nbsp;·&nbsp; Full product access
          </p>
        </div>
      </section>

      {/* ── Future pricing label ── */}
      <div className="px-4 pb-2">
        <div className="max-w-[1100px] mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#A3A3A0] text-center">
            Planned pricing after beta
          </p>
        </div>
      </div>

      {/* ── Plan positioning row ── */}
      <section className="px-4 pb-4">
        <div className="max-w-[1100px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ORDERED_PRICING_PLANS.map((plan) => (
            <div key={plan.id} className="text-center">
              <p
                className={`text-[11px] font-bold uppercase tracking-widest mb-0.5 ${
                  plan.popular ? "text-[#0866F5]" : "text-[#A3A3A0]"
                }`}
              >
                {plan.name}
              </p>
              <p className="text-[13px] font-semibold text-[#555552]">{plan.positioning}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Plan cards ── */}
      <section className="px-4 pb-16">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
          {ORDERED_PRICING_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="px-4 pb-20 bg-[#FAFAF8] pt-16">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-[32px] sm:text-[40px] font-bold text-[#171717] tracking-tight mb-3">
              Compare Plans
            </h2>
            <p className="text-[15px] text-[#777773]">
              Everything you need to find and fix your AI visibility gaps.
            </p>
          </div>
          <ComparisonTable />

          {/* Bottom CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8">
            {ORDERED_PRICING_PLANS.map((plan) => (
              <Link
                key={plan.id}
                href={plan.ctaHref}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[13px] font-semibold transition-all duration-150 active:scale-[0.97] ${
                  plan.popular
                    ? "bg-[#0866F5] text-white hover:bg-[#063B9D] shadow-lg shadow-blue-500/20"
                    : plan.id === "pro"
                      ? "bg-[#171717] text-white hover:bg-[#2A2A2A]"
                      : "bg-white border border-[#E5E5E1] text-[#171717] hover:bg-[#F5F5F2]"
                }`}
              >
                {plan.cta}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agency / multi-business section ── */}
      <section className="px-4 py-20">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#F0F0EC] text-[#777773] text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5 border border-[#E5E5E1]">
                <Building2 size={10} />
                Agencies &amp; Multi-business
              </div>
              <h2 className="text-[32px] sm:text-[38px] font-bold text-[#171717] tracking-tight leading-[1.1] mb-4">
                Managing multiple
                <br />
                businesses?
              </h2>
              <p className="text-[16px] text-[#777773] leading-relaxed mb-6">
                Use one Customers.Direct login to manage as many businesses or client accounts as
                you need. Each business has its own dashboard, competitors, scans, opportunities,
                history, and plan.
              </p>
              <p className="text-[14px] text-[#A3A3A0] leading-relaxed mb-8">
                Perfect for agencies, consultants, multi-brand operators, and business owners
                managing multiple locations or companies.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#171717] text-white font-semibold px-5 py-3 rounded-full text-[14px] hover:bg-[#2A2A2A] transition-all active:scale-[0.97]"
              >
                Start free — add clients later
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Right: Brandastic Agency workspace mock */}
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#111111" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0866F5] flex items-center justify-center text-white font-bold text-[13px] shrink-0">
                    B
                  </div>
                  <span className="text-white font-semibold text-[14px]">Brandastic Agency</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0866F5] bg-[#0866F5]/15 border border-[#0866F5]/30 px-2.5 py-1 rounded">
                  Agency Workspace
                </span>
              </div>

              {/* Body: brands left, stats right */}
              <div className="flex divide-x divide-white/10">
                {/* Brands list */}
                <div className="w-[48%] py-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 px-4 py-2">
                    Your Brands
                  </p>
                  {[
                    {
                      name: "UFC Gym",
                      bg: "#D4001A",
                      logo: (
                        <svg viewBox="0 0 28 28" width="16" height="16" aria-hidden="true">
                          <rect width="28" height="28" rx="3" fill="#D4001A" />
                          <text x="14" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="900" fontFamily="Arial">UFC</text>
                        </svg>
                      ),
                    },
                    {
                      name: "Microsoft",
                      bg: "#ffffff",
                      logo: (
                        <svg viewBox="0 0 21 21" width="16" height="16" aria-hidden="true">
                          <rect x="0" y="0" width="10" height="10" fill="#F25022" />
                          <rect x="11" y="0" width="10" height="10" fill="#7FBA00" />
                          <rect x="0" y="11" width="10" height="10" fill="#00A4EF" />
                          <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
                        </svg>
                      ),
                    },
                    {
                      name: "T-Mobile",
                      bg: "#E20074",
                      logo: (
                        <svg viewBox="0 0 28 28" width="16" height="16" aria-hidden="true">
                          <rect width="28" height="28" rx="3" fill="#E20074" />
                          <text x="14" y="20" textAnchor="middle" fill="white" fontSize="14" fontWeight="900" fontFamily="Arial">T</text>
                        </svg>
                      ),
                    },
                    {
                      name: "Vans",
                      bg: "#1a1a1a",
                      logo: (
                        <svg viewBox="0 0 28 28" width="16" height="16" aria-hidden="true">
                          <rect width="28" height="28" rx="3" fill="#111" />
                          <text x="14" y="20" textAnchor="middle" fill="white" fontSize="11" fontWeight="900" fontFamily="Arial">VANS</text>
                        </svg>
                      ),
                    },
                  ].map((brand, i) => (
                    <div
                      key={brand.name}
                      className={`flex items-center gap-3 px-4 py-2.5 ${i === 0 ? "bg-white/10" : "hover:bg-white/5"} transition-colors cursor-default`}
                    >
                      <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-white/10">
                        {brand.logo}
                      </div>
                      <span className="text-[13px] font-medium text-white">{brand.name}</span>
                    </div>
                  ))}
                  {/* Add Business button */}
                  <div className="px-4 pt-3 pb-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0866F5] hover:text-[#60A5FA] transition-colors"
                    >
                      <Plus size={13} />
                      Add Business
                    </button>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="flex-1 p-3 grid grid-cols-2 gap-2 content-start">
                  {[
                    {
                      label: "AI Visibility",
                      value: "82",
                      icon: (
                        <svg viewBox="0 0 24 8" width="32" height="10" className="mt-0.5" aria-hidden="true">
                          <polyline points="0,7 4,5 8,3 12,4 16,2 20,1 24,0" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ),
                      iconColor: "#3B82F6",
                    },
                    { label: "Prompts Won", value: "10/12", iconColor: "#22C55E" },
                    { label: "Competitors", value: "5 tracked", iconColor: "#F59E0B" },
                    { label: "Open Opps", value: "3", iconColor: "#A78BFA" },
                    { label: "Last Scan", value: "2 hrs ago", iconColor: "#9CA3AF", wide: true },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className={`bg-white/5 border border-white/10 rounded-xl p-3 ${stat.wide ? "col-span-2" : ""}`}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5" style={{ color: stat.iconColor }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: stat.iconColor }} aria-hidden="true" />
                        {stat.label}
                      </p>
                      <div className="flex items-end gap-2">
                        <p className="text-[18px] font-bold text-white leading-none">{stat.value}</p>
                        {stat.icon}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/10 flex items-center gap-2">
                <Shield size={11} className="text-white/30 shrink-0" />
                <p className="text-[10.5px] text-white/40 leading-snug">
                  <strong className="text-white/60">Agency billing:</strong> You pay Customers.Direct monthly. Your clients never see our invoices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value section: SEE → COMPARE → FIX → IMPROVE ── */}
      <section className="px-4 py-20 bg-[#FAFAF8]">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-[32px] sm:text-[40px] font-bold text-[#171717] tracking-tight mb-3">
              More than an AI visibility tracker
            </h2>
            <p className="text-[16px] text-[#777773] max-w-[500px] mx-auto">
              A complete system to measure, understand, and improve how AI recommends your business.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                label: "SEE",
                icon: Eye,
                color: "#0866F5",
                bg: "#EFF6FF",
                title: "See where you show up",
                body: "See exactly where your business appears across ChatGPT, Claude, Perplexity, Gemini, and Google AI search.",
              },
              {
                step: "2",
                label: "COMPARE",
                icon: BarChart3,
                color: "#7C3AED",
                bg: "#F5F3FF",
                title: "Compare with competitors",
                body: "See which competitors are getting recommended instead — prompt by prompt, platform by platform.",
              },
              {
                step: "3",
                label: "FIX",
                icon: Wrench,
                color: "#D97706",
                bg: "#FFFBEB",
                title: "Know exactly what to fix",
                body: "Customers.Direct shows the exact pages, citations, keywords, content, or SEO issues that need attention.",
              },
              {
                step: "4",
                label: "IMPROVE",
                icon: TrendingUp,
                color: "#059669",
                bg: "#F0FDF4",
                title: "Track results over time",
                body: "Use Direct Agent and Claude implementation prompts to make changes and watch your score improve.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white rounded-2xl border border-[#E5E5E1] p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: item.bg }}
                  >
                    <item.icon size={18} style={{ color: item.color }} />
                  </div>
                  <span
                    className="text-[11px] font-black uppercase tracking-widest"
                    style={{ color: item.color }}
                  >
                    {item.label}
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-[#171717] mb-2">{item.title}</h3>
                <p className="text-[13px] text-[#777773] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Flow indicator */}
          <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
            {["SEE", "COMPARE", "FIX", "IMPROVE"].map((step, i) => (
              <React.Fragment key={step}>
                <span
                  className="text-[13px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg"
                  style={{
                    background: ["#EFF6FF", "#F5F3FF", "#FFFBEB", "#F0FDF4"][i],
                    color: ["#1D4ED8", "#6D28D9", "#92400E", "#065F46"][i],
                  }}
                >
                  {step}
                </span>
                {i < 3 && (
                  <ArrowRight size={14} className="text-[#D4D4CF] shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 py-20">
        <div className="max-w-[780px] mx-auto">
          <h2 className="text-[32px] font-bold text-[#171717] tracking-tight mb-10 text-center">
            Frequently asked questions
          </h2>
          <div className="bg-white rounded-2xl border border-[#E5E5E1] shadow-sm px-7">
            {FAQ_ITEMS.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="px-4 pb-24">
        <div className="max-w-[900px] mx-auto">
          <div
            className="rounded-3xl overflow-hidden relative text-center px-8 py-16 sm:py-20"
            style={{ background: NAV_GRADIENT }}
          >
            {/* Subtle radial glow */}
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
                  href="mailto:hello@customers.direct?subject=Sales enquiry"
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

      <SiteFooter />
    </div>
  );
}
