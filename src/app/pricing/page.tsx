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
                {plan.trialLabel} · No credit card required
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
    q: "Is pricing per business?",
    a: "Yes. Each business workspace has its own plan. One login can manage unlimited businesses — each with its own dashboard, competitors, scans, and data.",
  },
  {
    q: "Do you offer a free trial?",
    a: "Yes. Starter, Growth, and Pro all include a 14-day free trial with full platform access.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. For the current MVP, no credit card is required to start your free trial.",
  },
  {
    q: "What counts as a tracked AI search?",
    a: "A tracked search is a customer question or buying-intent prompt that Customers.Direct monitors across supported AI platforms such as ChatGPT, Claude, Perplexity, and Gemini.",
  },
  {
    q: "What happens after my trial ends?",
    a: "Your business data, scans, competitors, and history remain saved. Paid subscription activation will be available when billing is fully enabled. We'll notify you before your trial expires.",
  },
  {
    q: "Can agencies use Customers.Direct?",
    a: "Yes. Agencies can manage multiple client businesses from one login. Each business selects its own plan. There is no separate agency plan — the multi-business architecture is built in.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Businesses can upgrade or downgrade independently once billing is enabled.",
  },
  {
    q: "Does Customers.Direct actually fix my website?",
    a: "Customers.Direct identifies what needs to be fixed and provides Direct Agent guidance and Claude implementation prompts. Autonomous website changes are not part of the current MVP.",
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
              Start Free Trial <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-16 pb-12 px-4 text-center">
        <div className="max-w-[780px] mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#EFF6FF] text-[#1D4ED8] text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-6 border border-[#DBEAFE]">
            <Zap size={10} />
            14-Day Free Trial · No credit card required
          </div>
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
          <p className="text-[18px] text-[#777773] leading-relaxed max-w-[560px] mx-auto">
            Track your visibility across AI search and Google, compare competitors, uncover
            opportunities, and let Customers.Direct help you improve.
          </p>
        </div>
      </section>

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
              <p className="text-[14px] text-[#A3A3A0] leading-relaxed">
                Perfect for agencies, consultants, multi-brand operators, and business owners
                managing multiple locations or companies.
              </p>
            </div>

            {/* Right: workspace preview */}
            <div className="bg-white border border-[#E5E5E1] rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#EEEEEA] bg-[#FAFAF8]">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#A3A3A0]">
                  Your businesses
                </p>
              </div>
              <div className="divide-y divide-[#EEEEEA]">
                {[
                  { name: "ABC Roofing", plan: "Growth", price: "$297/mo", color: "#0866F5", initial: "A" },
                  { name: "Glow Med Spa", plan: "Starter", price: "$149/mo", color: "#8B5CF6", initial: "G" },
                  { name: "Smith Dental", plan: "Pro", price: "$497/mo", color: "#059669", initial: "S" },
                ].map((biz) => (
                  <div key={biz.name} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAF8] transition-colors">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[14px] shrink-0"
                      style={{ background: biz.color }}
                    >
                      {biz.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#171717]">{biz.name}</p>
                      <p className="text-[12px] text-[#A3A3A0]">{biz.plan} — {biz.price}</p>
                    </div>
                    <ChevronDown size={14} className="-rotate-90 text-[#D4D4CF]" />
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-[#EEEEEA]">
                <button
                  type="button"
                  className="flex items-center gap-2 text-[13px] font-semibold text-[#0866F5] hover:text-[#063B9D] transition-colors"
                >
                  <Plus size={14} />
                  Add business
                </button>
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
                Start your 14-day free trial and discover how your business appears across AI search
                and Google.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="flex items-center gap-2 bg-white text-[#0866F5] font-bold px-7 py-3.5 rounded-full hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-px text-[15px] active:scale-[0.97]"
                >
                  Start Free Trial
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
                No credit card required · 14-day free trial · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
