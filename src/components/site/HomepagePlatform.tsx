"use client";

import React from "react";
import Link from "next/link";
import { PlatformIcon } from "@/components/PlatformIcon";
import {
  ArrowRight,
  Check,
  BarChart3,
  Users,
  Lightbulb,
  Bot,
  RefreshCw,
  LayoutDashboard,
  MessagesSquare,
  Target,
  Quote,
  Trophy,
  CheckCircle2,
  XCircle,
  Copy,
  Send,
  Building2,
  ChevronRight,
  Zap,
  ExternalLink,
} from "lucide-react";

// ─── Shared layout primitives ─────────────────────────────────────────────

function Section({
  id,
  bg = "bg-[#FAFAF8]",
  children,
  className = "",
}: {
  id?: string;
  bg?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`${bg} py-20 sm:py-24 px-4 overflow-hidden ${className}`}>
      <div className="max-w-[1160px] mx-auto">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] bg-[#F0F0EC] border border-[#E5E5E1] px-3 py-1 rounded-full mb-5 uppercase tracking-wider">
      {children}
    </p>
  );
}

function H2({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-[32px] sm:text-[40px] font-bold text-[#171717] leading-[1.1] tracking-tight ${className}`}>
      {children}
    </h2>
  );
}

function Body({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[15px] text-[#777773] leading-relaxed ${className}`}>{children}</p>
  );
}

function PrimaryBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 bg-[#171717] text-white font-semibold px-5 py-3 rounded-lg hover:bg-[#2A2A2A] transition-all duration-150 active:scale-[0.97] text-[14px]"
    >
      {children}
    </Link>
  );
}

function SecondaryBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 bg-white text-[#171717] font-semibold px-5 py-3 rounded-lg border border-[#E5E5E1] hover:bg-[#F5F5F2] hover:border-[#D4D4CF] transition-all duration-150 text-[14px]"
    >
      {children}
    </Link>
  );
}

// ─── Dashboard mock primitives ────────────────────────────────────────────

const SCORE_HISTORY = [28, 33, 36, 42, 48, 55, 62, 68, 74, 82];

function MiniChart({
  values = SCORE_HISTORY,
  color = "#3B82F6",
  h = 48,
}: {
  values?: number[];
  color?: string;
  h?: number;
}) {
  const w = 200;
  const pad = 2;
  const max = 100;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return { x, y };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1].x} ${h - pad} L ${pts[0].x} ${h - pad} Z`;
  const gradId = `g${color.replace("#", "")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      style={{ height: h }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── 1. HERO ─────────────────────────────────────────────────────────────

const AI_PLATFORMS = [
  { name: "ChatGPT", color: "#10B981" },
  { name: "Claude", color: "#8B5CF6" },
  { name: "Perplexity", color: "#3B82F6" },
  { name: "Gemini", color: "#EF4444" },
  { name: "Google AI", color: "#EAB308" },
];

// Demo data for hero dashboard preview
const DEMO_SERIES = [
  { name: "Bike Shop", color: "#171717", w: 2, data: [34,38,42,45,50,54,58,55,61,65] },
  { name: "Trek Store", color: "#3B82F6", w: 1.5, data: [65,63,68,70,72,69,74,76,73,78] },
  { name: "REI", color: "#EF4444", w: 1.5, data: [52,55,57,60,58,62,60,64,62,66] },
  { name: "Giant Bikes", color: "#F59E0B", w: 1.5, data: [40,38,42,44,45,48,46,50,48,52] },
  { name: "Specialized", color: "#8B5CF6", w: 1.5, data: [28,30,28,32,34,32,36,38,36,40] },
];
const DEMO_COMPETITORS = [
  { rank:1, name:"Trek Store",   color:"#3B82F6", vis:"78%", delta:"+0.3", up:true,  isYou:false },
  { rank:2, name:"REI",          color:"#EF4444", vis:"66%", delta:"-0.1", up:false, isYou:false },
  { rank:3, name:"Bike Shop",    color:"#171717", vis:"65%", delta:"+0.3", up:true,  isYou:true  },
  { rank:4, name:"Giant Bikes",  color:"#F59E0B", vis:"52%", delta:"-0.2", up:false, isYou:false },
  { rank:5, name:"Specialized",  color:"#8B5CF6", vis:"40%", delta:"+0.4", up:true,  isYou:false },
];
const DEMO_DOMAINS = [
  { domain:"reddit.com",    type:"UGC",        used:"32%", avg:"3.2" },
  { domain:"bikeshop.com",  type:"You",        used:"43%", avg:"5.2" },
  { domain:"wikipedia.org", type:"Reference",  used:"31%", avg:"1.4" },
  { domain:"bikeradar.com", type:"Editorial",  used:"45%", avg:"2.4" },
];
const TYPE_BADGE: Record<string,{bg:string;text:string}> = {
  UGC:       {bg:"#EFF6FF",text:"#1D4ED8"},
  Editorial: {bg:"#FFF7ED",text:"#C2410C"},
  Reference: {bg:"#F5F3FF",text:"#6D28D9"},
  Competitor:{bg:"#FEF2F2",text:"#DC2626"},
  You:       {bg:"#F0FDF4",text:"#15803D"},
};
const CHART_W = 400, CHART_H = 90;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"];

function smoothPath(data: number[], w: number, h: number): string {
  const pts: [number,number][] = data.map((v,i) => [
    (i/(data.length-1))*w, h-(v/100)*h,
  ]);
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i=1; i<pts.length; i++) {
    const p = pts[i-1], c = pts[i];
    const cpx = ((p[0]+c[0])/2).toFixed(1);
    d += ` C ${cpx} ${p[1].toFixed(1)} ${cpx} ${c[1].toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
  }
  return d;
}

function HeroDashboardPreview() {
  const tooltipAt = 6; // index where the tooltip shows
  const tooltipX = (tooltipAt/(DEMO_SERIES[0].data.length-1))*CHART_W;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E1] overflow-hidden w-full"
      style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)" }}>

      {/* Top filter bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[#EEEEEA] bg-white">
        <div className="flex items-center gap-1 bg-[#F5F5F2] border border-[#E5E5E1] rounded-md px-2 py-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500 shrink-0" />
          <span className="text-[9px] font-semibold text-[#171717]">Bike Shop</span>
        </div>
        {["Last 7 days","All tags","All Models"].map(l => (
          <span key={l} className="flex items-center gap-1 border border-[#E5E5E1] rounded-md px-2 py-1 text-[9px] text-[#777773]">
            <span className="w-1.5 h-1.5 rounded-full border border-[#A3A3A0]" />
            {l}
          </span>
        ))}
        <div className="ml-auto flex items-center gap-3 text-[8px] text-[#777773]">
          <span>Visibility: <strong className="text-[#171717]">3/14</strong> <span className="text-[#EF4444]">↓</span></span>
          <span>Sentiment: <strong className="text-[#171717]">2/14</strong> <span className="text-[#10B981]">↑</span></span>
          <span>Position: <strong className="text-[#171717]">5/14</strong> <span className="text-[#10B981]">↑</span></span>
        </div>
      </div>

      <div className="flex overflow-hidden" style={{ height: 420 }}>
        {/* Left sidebar */}
        <div className="w-[110px] shrink-0 bg-white border-r border-[#EEEEEA] flex flex-col py-3">
          <div className="px-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logos/logo-black.png" alt="Customers.Direct"
              className="h-4 w-auto" aria-hidden="true" />
          </div>
          <div className="px-2 mb-1">
            <p className="text-[7px] font-semibold uppercase tracking-wider text-[#A3A3A0] mb-1 px-1">Quick Actions</p>
            <div className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[8px] text-[#A3A3A0]">
              <Target size={8} aria-hidden="true" />
              Find anything…
            </div>
          </div>
          <p className="text-[7px] font-semibold uppercase tracking-wider text-[#A3A3A0] px-3 mb-1 mt-2">Pages</p>
          <nav className="flex flex-col gap-px px-2">
            {[
              { label:"Overview",     icon:LayoutDashboard,  active:true  },
              { label:"Prompts",      icon:MessagesSquare,   active:false },
              { label:"Sources",      icon:ExternalLink,     active:false },
              { label:"Models",       icon:BarChart3,        active:false },
              { label:"Competitors",  icon:Users,            active:false },
              { label:"Settings",     icon:RefreshCw,        active:false },
            ].map(({ label, icon: Icon, active }) => (
              <div key={label}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[8px] font-medium ${
                  active ? "bg-[#F0F0EC] text-[#171717]" : "text-[#A3A3A0]"
                }`}>
                <Icon size={8} aria-hidden="true" />
                {label}
              </div>
            ))}
          </nav>
        </div>

        {/* Centre main area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-[#EEEEEA]">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#EEEEEA] bg-white">
            <span className="text-[8px] text-[#777773]">
              <span className="text-[#171717] font-semibold">Overview</span>
              &nbsp;·&nbsp;Your visibility is up 5.2% this month
            </span>
          </div>

          {/* Tab row */}
          <div className="flex items-center gap-0 px-4 border-b border-[#EEEEEA] bg-white">
            {["Visibility","Sentiment","Position"].map((t,i) => (
              <span key={t}
                className={`px-3 py-2 text-[9px] font-semibold border-b-[1.5px] ${
                  i===0
                    ? "border-[#171717] text-[#171717]"
                    : "border-transparent text-[#A3A3A0]"
                }`}>
                {t}
              </span>
            ))}
          </div>

          {/* Chart */}
          <div className="relative px-4 pt-3 pb-0 bg-white">
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H+16}`}
              className="w-full overflow-visible"
              aria-hidden="true"
            >
              {/* Grid */}
              {[0,25,50,75,100].map(v => {
                const y = CHART_H-(v/100)*CHART_H;
                return <line key={v} x1="0" y1={y} x2={CHART_W} y2={y} stroke="#EEEEEA" strokeWidth="0.6" />;
              })}
              {/* Lines */}
              {DEMO_SERIES.map(s => (
                <path key={s.name} d={smoothPath(s.data, CHART_W, CHART_H)}
                  fill="none" stroke={s.color} strokeWidth={s.w}
                  strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {/* Tooltip vertical line */}
              <line x1={tooltipX} y1="0" x2={tooltipX} y2={CHART_H}
                stroke="#D4D4CF" strokeWidth="1" strokeDasharray="3 2" />
              {/* Endpoint dots */}
              {DEMO_SERIES.map(s => {
                const v = s.data[s.data.length-1];
                const cx = CHART_W;
                const cy = CHART_H-(v/100)*CHART_H;
                return (
                  <circle key={s.name} cx={cx} cy={cy} r="3"
                    fill="white" stroke={s.color} strokeWidth="1.5" />
                );
              })}
              {/* Tooltip dots at tooltipAt */}
              {DEMO_SERIES.map(s => {
                const v = s.data[tooltipAt];
                const cy = CHART_H-(v/100)*CHART_H;
                return (
                  <circle key={s.name+"t"} cx={tooltipX} cy={cy} r="2.5"
                    fill="white" stroke={s.color} strokeWidth="1.5" />
                );
              })}
              {/* Month labels */}
              {[0,2,4,6,8].map(i => (
                <text key={i} x={(i/(DEMO_SERIES[0].data.length-1))*CHART_W}
                  y={CHART_H+13} textAnchor="middle" fontSize="7.5" fill="#A3A3A0">
                  {MONTHS[i]}
                </text>
              ))}
            </svg>
            {/* Tooltip overlay */}
            <div className="absolute top-3 pointer-events-none"
              style={{ left: `calc(${(tooltipX/CHART_W)*100}% + 6px)` }}>
              <div className="bg-[#171717] text-white rounded-xl px-3 py-2 shadow-xl whitespace-nowrap">
                <p className="text-[7px] font-semibold text-white/50 mb-1.5">Jul 2025</p>
                {DEMO_SERIES.map(s => (
                  <div key={s.name} className="flex items-center gap-2 mb-1 last:mb-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:s.color}} />
                    <span className="text-[8px] text-white/80 flex-1 min-w-[60px]">{s.name}</span>
                    <span className="text-[8px] font-bold text-white tabular-nums">+{s.data[tooltipAt]}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Domain table */}
          <div className="flex-1 overflow-hidden bg-[#FAFAF8] border-t border-[#EEEEEA]">
            {/* Tab bar */}
            <div className="flex items-center gap-0 px-4 bg-white border-b border-[#EEEEEA]">
              {["Domains","URLs"].map((t,i) => (
                <span key={t} className={`px-3 py-1.5 text-[9px] font-semibold border-b-[1.5px] ${
                  i===0 ? "border-[#171717] text-[#171717]" : "border-transparent text-[#A3A3A0]"
                }`}>{t}</span>
              ))}
            </div>
            {/* Header */}
            <div className="grid px-4 py-1.5 border-b border-[#EEEEEA] bg-white"
              style={{ gridTemplateColumns:"20px 1fr 80px 50px 70px" }}>
              {["#","Domain","Type","Used","Avg. Citations"].map(h => (
                <span key={h} className="text-[7px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{h}</span>
              ))}
            </div>
            {/* Rows */}
            {DEMO_DOMAINS.map(({ domain, type, used, avg }, i) => {
              const badge = TYPE_BADGE[type] ?? {bg:"#F0F0EC",text:"#777773"};
              return (
                <div key={domain}
                  className={`grid items-center px-4 py-2 border-b border-[#EEEEEA] ${
                    type==="You" ? "bg-[#F0FDF4]/60" : i%2===0 ? "bg-white" : "bg-[#FAFAF8]"
                  }`}
                  style={{ gridTemplateColumns:"20px 1fr 80px 50px 70px" }}>
                  <span className="text-[8px] text-[#A3A3A0]">{i+1}</span>
                  <span className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                      width={12} height={12} alt="" aria-hidden="true"
                      className="rounded-sm shrink-0" />
                    <span className="text-[8px] font-medium text-[#171717] truncate">{domain}</span>
                  </span>
                  <span className="text-[7px] font-semibold rounded-full px-1.5 py-px w-fit"
                    style={{background:badge.bg, color:badge.text}}>
                    {type}
                  </span>
                  <span className="text-[8px] font-semibold text-[#777773]">{used}</span>
                  <span className="text-[8px] font-semibold text-[#777773]">{avg}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right competitors panel */}
        <div className="w-[185px] shrink-0 bg-white flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-[#EEEEEA]">
            <p className="text-[9px] font-bold text-[#171717]">Your competitors</p>
            <p className="text-[7px] text-[#A3A3A0]">Compare with AI results</p>
          </div>
          {/* Header row */}
          <div className="grid px-3 py-1 border-b border-[#EEEEEA]"
            style={{ gridTemplateColumns:"14px 1fr 36px 28px" }}>
            {["#","Brand","Vis.","+/-"].map(h => (
              <span key={h} className="text-[6.5px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {/* Competitor rows */}
          {DEMO_COMPETITORS.map(({ rank, name, color, vis, delta, up, isYou }) => (
            <div key={name}
              className={`grid items-center px-3 py-2 border-b border-[#EEEEEA] ${isYou ? "bg-[#F0F0EC]/50" : ""}`}
              style={{ gridTemplateColumns:"14px 1fr 36px 28px" }}>
              <span className="text-[7px] text-[#A3A3A0] font-semibold">{rank}</span>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: color, fontSize: 5.5 }}>
                  {name[0]}
                </span>
                <span className={`text-[8px] font-semibold truncate ${isYou ? "text-[#171717]" : "text-[#777773]"}`}>
                  {name}{isYou ? " ★" : ""}
                </span>
              </span>
              <span className="text-[7.5px] font-bold text-[#171717] tabular-nums">{vis}</span>
              <span className={`text-[7px] font-semibold tabular-nums ${up ? "text-[#15803D]" : "text-[#DC2626]"}`}>
                {up?"↑":"↓"}{delta.replace(/[+-]/,"")}
              </span>
            </div>
          ))}
          {/* Domains by type mini section */}
          <div className="px-3 pt-3">
            <p className="text-[8px] font-bold text-[#171717] mb-1">Domains by Type</p>
            <p className="text-[7px] text-[#A3A3A0] mb-2">Most cited, by category</p>
            {[
              { label:"UGC",      pct:32, color:"#3B82F6" },
              { label:"Editorial",pct:28, color:"#F59E0B" },
              { label:"Reference",pct:21, color:"#8B5CF6" },
              { label:"You",      pct:12, color:"#10B981" },
              { label:"Other",    pct:7,  color:"#D4D4CF" },
            ].map(({ label, pct, color }) => (
              <div key={label} className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
                <span className="text-[7.5px] text-[#777773] flex-1">{label}</span>
                <span className="text-[7.5px] font-bold text-[#171717] tabular-nums">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Soft bottom fade */}
      <div className="h-10 bg-gradient-to-t from-white/80 to-transparent -mt-10 relative pointer-events-none" />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-[#FAFAF8] px-4 pt-16 pb-8 sm:pt-20 sm:pb-10 overflow-hidden border-b border-[#EEEEEA]">
      <div className="max-w-[1160px] mx-auto">
        {/* Centered copy block */}
        <div className="max-w-3xl mx-auto text-center mb-12 fade-up">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] bg-[#F0F0EC] border border-[#E5E5E1] px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            AI search visibility for businesses and agencies
          </div>

          <h1 className="text-[42px] sm:text-[54px] lg:text-[60px] font-bold text-[#171717] leading-[1.06] tracking-tight mb-5">
            See how AI finds, ranks,<br className="hidden sm:block" /> and recommends your business.
          </h1>

          <p className="text-[16px] sm:text-[17px] text-[#777773] leading-relaxed mb-8 max-w-2xl mx-auto">
            Track your visibility across ChatGPT, Claude, Perplexity, Gemini, and Google AI. Compare competitors, uncover the sources shaping AI answers, and turn every insight into an actionable fix.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <PrimaryBtn href="/signup">
              Check My AI Visibility
              <ArrowRight size={14} aria-hidden="true" />
            </PrimaryBtn>
            <SecondaryBtn href="/how-it-works">
              See How It Works
            </SecondaryBtn>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#A3A3A0]">
            {["No credit card required", "Set up in minutes", "Built for businesses and agencies"].map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <Check size={12} className="text-[#777773] shrink-0" aria-hidden="true" />
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Platform pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {AI_PLATFORMS.map(({ name }) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#777773] bg-white border border-[#E5E5E1] px-3 py-1.5 rounded-full"
            >
              <PlatformIcon platform={name} size={14} />
              {name}
            </span>
          ))}
        </div>

        {/* Dashboard preview */}
        <div className="fade-up fade-up-delay-2 max-w-4xl mx-auto">
          <HeroDashboardPreview />
        </div>
      </div>
    </section>
  );
}

// ─── 1b. BANNER ROTATION ───────────────────────────────────────────────────

const BANNERS = [
  {
    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/banners/banner1/ChatGPT%20Image%20Aug%2026,%202026,%2012_26_18%20PM%20(6).png",
    alt: "Hair salon owner gets a new booking through Google AI",
    industry: "Hair Salon",
    platform: "Google AI",
  },
  {
    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/banners/banner1/ChatGPT%20Image%20Aug%2026,%202026,%2012_26_17%20PM%20(2).png",
    alt: "Dentist receives a new patient request through Perplexity",
    industry: "Dental Practice",
    platform: "Perplexity",
  },
  {
    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/banners/banner1/ChatGPT%20Image%20Aug%2026,%202026,%2012_26_17%20PM%20(1).png",
    alt: "Gym owner gets a new member notification through ChatGPT",
    industry: "Fitness Studio",
    platform: "ChatGPT",
  },
  {
    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/banners/banner1/ChatGPT%20Image%20Aug%2026,%202026,%2012_26_18%20PM%20(7).png",
    alt: "Auto mechanic gets a service booking through Google AI",
    industry: "Auto Service",
    platform: "Google AI",
  },
];

function BannerRotationSection() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const banner = BANNERS[active];

  return (
    <section className="bg-[#171717] overflow-hidden" aria-label="AI sends customers directly to your business">
      {/* Heading only */}
      <div className="text-center px-4 pt-12 pb-8">
        <h2 className="text-[28px] sm:text-[36px] font-bold text-white leading-tight tracking-tight max-w-2xl mx-auto">
          AI is already sending customers to businesses that show up.
        </h2>
      </div>

      {/* Image — instant swap, no transition */}
      <div className="w-full max-w-5xl mx-auto px-4 pb-10">
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={active}
            src={banner.src}
            alt={banner.alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          {/* Industry label */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
            <span className="text-[11px] font-semibold text-white/90">{banner.industry}</span>
            <span className="text-white/30 text-[10px]">·</span>
            <span className="text-[11px] text-white/60">{banner.platform}</span>
          </div>
        </div>

        {/* Dot pagination */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show slide ${i + 1}`}
              className="rounded-full"
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

// ─── 2. PROMPT TRACKING ────────────────────────────────────────────────────

const SAMPLE_PROMPTS = [
  { text: "Who is the best HVAC company near me?", platform: "ChatGPT" },
  { text: "Which local dentist accepts new patients?", platform: "Claude" },
  { text: "What is the best CRM for a small agency?", platform: "Perplexity" },
  { text: "Which roofing company has the strongest reviews?", platform: "Gemini" },
  { text: "Who offers emergency plumbing in Dallas?", platform: "ChatGPT" },
  { text: "Best mountain bike shop under $5,000?", platform: "Claude" },
  { text: "Which accounting software is best for freelancers?", platform: "Perplexity" },
  { text: "Top-rated flooring company near Austin?", platform: "Google AI" },
  { text: "Best yoga studio for beginners in NYC?", platform: "ChatGPT" },
  { text: "Who offers same-day HVAC repair in Phoenix?", platform: "Gemini" },
];


function PromptTrackingSection() {
  const doubled = [...SAMPLE_PROMPTS, ...SAMPLE_PROMPTS];
  return (
    <Section id="prompt-tracking" bg="bg-white" className="border-b border-[#EEEEEA]">
      <div className="text-center mb-12">
        <Eyebrow>Prompt Tracking</Eyebrow>
        <H2 className="mb-4">
          AI platforms are the new search engines.<br />
          <span className="text-[#777773]">Track the prompts that define your relevance.</span>
        </H2>
        <Body className="max-w-xl mx-auto">
          Every buyer question that an AI model answers is an opportunity. Know which ones you win, which you lose, and what to do next.
        </Body>
      </div>

      {/* Marquee */}
      <div className="overflow-hidden -mx-4 px-4">
        <div className="flex gap-3 marquee-scroll" aria-hidden="true">
          {doubled.map(({ text, platform }, i) => (
            <div
              key={i}
              className="shrink-0 flex items-center gap-2.5 bg-[#FAFAF8] border border-[#E5E5E1] rounded-full px-4 py-2 whitespace-nowrap"
            >
              <PlatformIcon platform={platform} size={14} />
              <span className="text-[13px] font-medium text-[#171717]">{text}</span>
              <span className="text-[11px] text-[#A3A3A0]">{platform}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            icon: MessagesSquare,
            title: "Add buyer prompts",
            body: "Tell us what buyers search when they need what you offer. We track them across every AI platform.",
          },
          {
            icon: BarChart3,
            title: "See your visibility",
            body: "Get a clear score showing how often AI recommends your business on each prompt.",
          },
          {
            icon: Lightbulb,
            title: "Get specific fixes",
            body: "Every gap becomes an evidence-backed opportunity with a recommended action and a Claude prompt.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4">
            <div className="w-9 h-9 rounded-lg bg-[#F0F0EC] border border-[#E5E5E1] flex items-center justify-center shrink-0 mt-0.5">
              <Icon size={16} className="text-[#777773]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#171717] mb-1">{title}</p>
              <p className="text-[13px] text-[#777773] leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── 3. AI VISIBILITY ─────────────────────────────────────────────────────

// ─── PRODUCT TABS (replaces 5 separate sections) ──────────────────────────

const PRODUCT_TABS = [
  { id: "visibility",   label: "AI Visibility" },
  { id: "competitors",  label: "Competitors" },
  { id: "sources",      label: "Sources" },
  { id: "opportunities",label: "Opportunities" },
  { id: "agent",        label: "Direct Agent" },
] as const;

type TabId = typeof PRODUCT_TABS[number]["id"];

function ProductTabsSection() {
  const [active, setActive] = React.useState<TabId>("visibility");

  return (
    <Section id="product" bg="bg-[#FAFAF8]" className="border-b border-[#EEEEEA] !py-0 !overflow-visible">
      {/* Sticky tab bar */}
      <div className="sticky top-0 z-30 bg-[#FAFAF8]/95 backdrop-blur-sm border-b border-[#EEEEEA] -mx-4 px-4">
        <div className="max-w-[1160px] mx-auto overflow-x-auto scrollbar-none">
          <div className="flex gap-0 min-w-max">
            {PRODUCT_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={`relative px-5 py-4 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  active === id
                    ? "text-[#171717]"
                    : "text-[#A3A3A0] hover:text-[#777773]"
                }`}
              >
                {label}
                {active === id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#171717] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="py-16 sm:py-20">
        {active === "visibility" && <VisibilityTabContent />}
        {active === "competitors" && <CompetitorsTabContent />}
        {active === "sources" && <SourcesTabContent />}
        {active === "opportunities" && <OpportunitiesTabContent />}
        {active === "agent" && <AgentTabContent />}
      </div>
    </Section>
  );
}

// ── Tab: AI Visibility ────────────────────────────────────────────────────

function AIVisibilitySection() {
  const providerData = [
    { name: "ChatGPT", score: 82, mentions: 9, total: 10, color: "#10B981" },
    { name: "Claude", score: 74, mentions: 7, total: 10, color: "#8B5CF6" },
    { name: "Perplexity", score: 68, mentions: 6, total: 10, color: "#3B82F6" },
    { name: "Gemini", score: 51, mentions: 5, total: 10, color: "#EF4444" },
    { name: "Google AI", score: 44, mentions: 4, total: 10, color: "#EAB308" },
  ];

  return (
    <Section id="ai-visibility" bg="bg-[#FAFAF8]" className="border-b border-[#EEEEEA]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left copy */}
        <div>
          <Eyebrow>AI Visibility</Eyebrow>
          <H2 className="mb-4">See exactly where AI recommends your business.</H2>
          <Body className="mb-6 max-w-[460px]">
            Every scan queries the AI platforms that buyers actually use. You see a Direct Score,
            a platform-by-platform breakdown, and exactly which prompts you win or lose.
          </Body>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "Direct Score — your single AI visibility number out of 100",
              "Visibility breakdown by ChatGPT, Claude, Perplexity, Gemini, and Google AI",
              "Historical trend tracking across every scan",
              "Win/loss analysis per buyer-intent prompt",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#777773]">
                <CheckCircle2 size={15} className="text-[#171717] shrink-0 mt-0.5" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#171717] hover:text-[#2A2A2A] transition-colors underline-offset-2 hover:underline"
          >
            Get your free visibility score <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>

        {/* Right mock */}
        <div className="bg-white rounded-2xl border border-[#E5E5E1] p-5">
          {/* Score cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Direct Score", value: "82", sub: "/ 100", icon: Target, trend: "+12 pts" },
              { label: "Prompts Won", value: "10/12", sub: "83%", icon: Trophy, trend: "+3" },
              { label: "Citation Rate", value: "64%", sub: "avg: 48%", icon: Quote, trend: "+18%" },
            ].map(({ label, value, sub, icon: Icon, trend }) => (
              <div key={label} className="bg-[#FAFAF8] rounded-xl border border-[#E5E5E1] p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{label}</span>
                  <Icon size={12} className="text-[#D4D4CF]" aria-hidden="true" />
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <p className="text-[18px] font-bold text-[#171717] leading-none">{value}</p>
                  <p className="text-[11px] text-[#A3A3A0]">{sub}</p>
                </div>
                <span className="text-[11px] font-semibold text-[#166534]">↑ {trend}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-[#FAFAF8] rounded-xl border border-[#E5E5E1] p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-[#171717]">Visibility trend</p>
              <span className="text-[11px] text-[#A3A3A0]">Last 10 scans</span>
            </div>
            <MiniChart h={72} />
          </div>

          {/* Platform breakdown */}
          <div className="bg-[#FAFAF8] rounded-xl border border-[#E5E5E1] p-4">
            <p className="text-[13px] font-semibold text-[#171717] mb-3">Platform breakdown</p>
            <div className="flex flex-col gap-2.5">
              {providerData.map(({ name, score, mentions, total, color }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#171717] w-24 shrink-0">
                    <PlatformIcon platform={name} size={14} />
                    {name}
                  </span>
                  <div className="flex-1 h-1.5 bg-[#EEEEEA] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${score}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-[#777773] w-12 text-right shrink-0 tabular-nums">
                    {mentions}/{total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── 4. KEY SOURCES ────────────────────────────────────────────────────────

type BadgeStyle = { label: string; color: string; bg: string; border: string };

const BADGE_MAP: Record<string, BadgeStyle> = {
  UGC:        { label: "UGC",        color: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
  You:        { label: "You",        color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" },
  Reference:  { label: "Reference",  color: "#92400E", bg: "#FFFBEB", border: "#FDE68A" },
  Competitor: { label: "Competitor", color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" },
  Editorial:  { label: "Editorial",  color: "#0C4A6E", bg: "#F0F9FF", border: "#BAE6FD" },
};

function SourceBadge({ type }: { type: string }) {
  const s = BADGE_MAP[type] ?? { label: type, color: "#777773", bg: "#F0F0EC", border: "#E5E5E1" };
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ color: s.color, backgroundColor: s.bg, borderColor: s.border }}
    >
      {s.label}
    </span>
  );
}

function KeySourcesSection() {
  const sources = [
    { rank: 1, domain: "reddit.com", type: "UGC", used: "32%", avgCitations: "3.2", isYou: false },
    { rank: 2, domain: "yourbusiness.com", type: "You", used: "43%", avgCitations: "5.2", isYou: true },
    { rank: 3, domain: "wikipedia.org", type: "Reference", used: "31%", avgCitations: "1.4", isYou: false },
    { rank: 4, domain: "hubspot.com", type: "Competitor", used: "39%", avgCitations: "1.1", isYou: false },
    { rank: 5, domain: "techradar.com", type: "Editorial", used: "45%", avgCitations: "2.4", isYou: false },
  ];

  return (
    <Section id="citations" bg="bg-white" className="border-b border-[#EEEEEA]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left copy */}
        <div>
          <Eyebrow>Citations & Sources</Eyebrow>
          <H2 className="mb-4">Find the sources shaping AI answers.</H2>
          <Body className="mb-6 max-w-[460px]">
            AI systems cite specific websites when constructing answers. Customers.Direct reveals which domains are cited most, whether your site appears, and where competitors have citation advantages you can close.
          </Body>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "Full citation source list with appearance counts",
              "Your domain vs. competitor domain citation comparison",
              "Gap analysis — sources citing competitors but not you",
              "Source type classification: review, directory, editorial, UGC",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#777773]">
                <CheckCircle2 size={15} className="text-[#171717] shrink-0 mt-0.5" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right mock */}
        <div className="bg-[#FAFAF8] rounded-2xl border border-[#E5E5E1] p-5 relative">
          <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#EEEEEA] flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[#171717]">Top cited sources</p>
              <span className="text-[11px] text-[#A3A3A0]">Latest scan</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#EEEEEA] bg-[#FAFAF8]">
                    <th className="text-left font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">#</th>
                    <th className="text-left font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">Domain</th>
                    <th className="text-left font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">Type</th>
                    <th className="text-right font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">Used</th>
                    <th className="text-right font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">Avg cites</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEA]">
                  {sources.map(({ rank, domain, type, used, avgCitations, isYou }) => (
                    <tr
                      key={domain}
                      className={isYou ? "bg-[#F0FDF4]/60" : "hover:bg-[#FAFAF8]"}
                    >
                      <td className="px-4 py-2.5 text-[#A3A3A0] tabular-nums">{rank}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-semibold ${isYou ? "text-[#166534]" : "text-[#171717]"}`}>
                          {domain}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <SourceBadge type={type} />
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#777773] tabular-nums">{used}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[#171717] tabular-nums">{avgCitations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recommendation toast */}
          <div className="mt-4 flex items-center gap-2.5 bg-[#171717] text-white rounded-xl px-4 py-3">
            <CheckCircle2 size={14} className="text-[#22C55E] shrink-0" aria-hidden="true" />
            <p className="text-[12px] font-medium">5 source opportunities found</p>
            <ExternalLink size={11} className="text-white/40 ml-auto shrink-0" aria-hidden="true" />
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── 5. COMPETITOR INTELLIGENCE ───────────────────────────────────────────

function CompetitorSection() {
  const competitors = [
    { name: "Your business", score: 47, delta: "+5%", isYou: true },
    { name: "Competitor A", score: 65, delta: "-2%", isYou: false },
    { name: "Competitor B", score: 62, delta: "+1%", isYou: false },
    { name: "Competitor C", score: 34, delta: "-4%", isYou: false },
  ];

  const promptWins = [
    { prompt: "Best mountain bike shop near me", you: true, them: false },
    { prompt: "Top-rated bike repair service", you: false, them: true },
    { prompt: "Full suspension bike under $4,000", you: true, them: true },
    { prompt: "Kids bike fitting specialists", you: false, them: true },
    { prompt: "Bike rental for weekend trails", you: true, them: false },
  ];

  return (
    <Section id="competitors" bg="bg-[#FAFAF8]" className="border-b border-[#EEEEEA]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left mock */}
        <div className="bg-white rounded-2xl border border-[#E5E5E1] p-5">
          {/* Head-to-head */}
          <p className="text-[13px] font-semibold text-[#171717] mb-4">AI visibility — head-to-head</p>
          <div className="flex flex-col gap-2.5 mb-5">
            {competitors.map(({ name, score, delta, isYou }) => (
              <div key={name} className="flex items-center gap-3">
                <span className={`text-[12px] font-medium w-28 shrink-0 truncate ${isYou ? "text-[#171717] font-semibold" : "text-[#777773]"}`}>
                  {name}
                </span>
                <div className="flex-1 h-2 bg-[#F0F0EC] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${score}%`, backgroundColor: isYou ? "#171717" : "#D4D4CF" }}
                  />
                </div>
                <span className={`text-[11px] font-semibold w-6 text-right tabular-nums ${isYou ? "text-[#171717]" : "text-[#A3A3A0]"}`}>
                  {score}
                </span>
                <span className={`text-[10px] font-medium w-8 text-right tabular-nums ${delta.startsWith("+") ? "text-[#166534]" : "text-[#991B1B]"}`}>
                  {delta}
                </span>
              </div>
            ))}
          </div>

          {/* Prompt win/loss grid */}
          <p className="text-[11px] font-semibold text-[#A3A3A0] mb-2.5 uppercase tracking-wider">Prompt win/loss</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#EEEEEA]">
                  <th className="text-left font-semibold text-[#A3A3A0] pb-2 pr-4">Prompt</th>
                  <th className="text-center font-semibold text-[#171717] pb-2 px-3">You</th>
                  <th className="text-center font-semibold text-[#A3A3A0] pb-2 px-3">Comp A</th>
                </tr>
              </thead>
              <tbody>
                {promptWins.map(({ prompt, you, them }) => (
                  <tr key={prompt} className="border-b border-[#F5F5F2]">
                    <td className="py-2 pr-4 text-[#777773] max-w-[180px] truncate">{prompt}</td>
                    <td className="py-2 px-3 text-center">
                      {you ? (
                        <CheckCircle2 size={13} className="text-[#166534] mx-auto" aria-label="Won" />
                      ) : (
                        <XCircle size={13} className="text-[#D4D4CF] mx-auto" aria-label="Lost" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {them ? (
                        <CheckCircle2 size={13} className="text-[#991B1B] mx-auto" aria-label="Competitor won" />
                      ) : (
                        <XCircle size={13} className="text-[#D4D4CF] mx-auto" aria-label="Competitor lost" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right copy */}
        <div>
          <Eyebrow>Competitive Intelligence</Eyebrow>
          <H2 className="mb-4">Know who AI recommends instead of you.</H2>
          <Body className="mb-6 max-w-[460px]">
            See every competitor AI favors across your tracked prompts. Understand which categories they dominate, where you win, and what changes would shift the result.
          </Body>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "Tracked competitor list with per-prompt breakdown",
              "Head-to-head AI visibility percentage comparison",
              "Prompt-level win/loss vs. every competitor",
              "Changes between scans — see when gaps close or widen",
              "Turn competitor gaps into actionable Opportunities",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#777773]">
                <CheckCircle2 size={15} className="text-[#171717] shrink-0 mt-0.5" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#171717] hover:text-[#2A2A2A] transition-colors underline-offset-2 hover:underline"
          >
            See your competitor analysis <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

// ─── 6. OPPORTUNITIES ─────────────────────────────────────────────────────

const SAMPLE_OPPORTUNITIES = [
  {
    impact: "HIGH",
    title: "Missing buyer-intent prompts in ChatGPT",
    evidence: "Your business is not mentioned in 4 of 10 high-volume buyer prompts on ChatGPT.",
    action: "Create dedicated service/product pages matching query intent.",
    badgeColor: "text-[#991B1B] bg-[#FEF2F2] border-[#FECACA]",
  },
  {
    impact: "MED",
    title: "Weak structured data for local entity",
    evidence: "Schema markup is incomplete. AI has low confidence in your location and services.",
    action: "Add LocalBusiness schema with full address, hours, and service descriptions.",
    badgeColor: "text-[#92400E] bg-[#FFFBEB] border-[#FDE68A]",
  },
  {
    impact: "LOW",
    title: "Citation gap on Yelp and Google Business",
    evidence: "Top competitor is cited by Yelp and Google Business Profile 6× more often.",
    action: "Improve Yelp profile completeness and verify Google Business Profile.",
    badgeColor: "text-[#1E40AF] bg-[#EFF6FF] border-[#BFDBFE]",
  },
];

function OpportunitiesSection() {
  return (
    <Section id="opportunities" bg="bg-white" className="border-b border-[#EEEEEA]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
        {/* Left copy */}
        <div className="lg:sticky lg:top-24">
          <Eyebrow>Opportunities</Eyebrow>
          <H2 className="mb-4">Know exactly what to fix next.</H2>
          <Body className="mb-6 max-w-[460px]">
            Every opportunity is generated from real scan evidence — not generic advice. Each one includes the specific issue, why it matters, and a recommended action. Where the fix involves content or code, you get a ready-made prompt to send to Claude.
          </Body>

          <div className="bg-[#FAFAF8] rounded-xl border border-[#E5E5E1] p-4 mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A0] mb-3">
              The improvement loop
            </p>
            {[
              { step: "01", label: "Detect", desc: "AI scans identify gaps and missed prompts" },
              { step: "02", label: "Explain", desc: "Evidence-backed opportunity cards surface" },
              { step: "03", label: "Fix", desc: "Recommended action + Claude prompt provided" },
              { step: "04", label: "Rescan", desc: "Run a new scan after implementing the fix" },
              { step: "05", label: "Measure", desc: "Direct Score reflects the improvement" },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex items-start gap-3 py-2.5 border-b border-[#EEEEEA] last:border-0">
                <span className="text-[10px] font-bold text-[#777773] bg-[#F0F0EC] border border-[#E5E5E1] rounded-md w-7 h-7 flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {step}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-[#171717]">{label}</p>
                  <p className="text-[11px] text-[#777773]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — opportunity cards */}
        <div className="flex flex-col gap-4">
          {SAMPLE_OPPORTUNITIES.map(({ impact, title, evidence, action, badgeColor }) => (
            <div key={title} className="bg-white rounded-xl border border-[#E5E5E1] p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 mt-0.5 ${badgeColor}`}>
                  {impact} impact
                </span>
                <h3 className="text-[14px] font-semibold text-[#171717] leading-snug">{title}</h3>
              </div>
              <div className="bg-[#FAFAF8] rounded-lg px-3 py-2.5 mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A0] mb-1">Evidence</p>
                <p className="text-[12px] text-[#777773]">{evidence}</p>
              </div>
              <p className="text-[12px] text-[#171717] mb-3">
                <span className="font-semibold">Recommended: </span>{action}
              </p>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] bg-[#F5F5F2] border border-[#E5E5E1] px-3 py-1.5 rounded-lg hover:bg-[#EEEEEA] transition-colors">
                  <Copy size={11} aria-hidden="true" />
                  Copy for Claude
                </button>
                <button className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#171717] px-3 py-1.5 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                  <Zap size={11} aria-hidden="true" />
                  Request fix
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── 7. DIRECT AGENT ──────────────────────────────────────────────────────

const AGENT_MESSAGES = [
  {
    role: "user",
    text: "Why did my Direct Score drop from 74 to 68 this week?",
  },
  {
    role: "agent",
    text: `EVIDENCE: Your scan from May 14 shows that Perplexity stopped mentioning your business on 2 prompts where it previously included you — specifically "best bike shop in Austin" and "Trek dealer near downtown Austin."

EVIDENCE: A new competitor (specialized-austin.com) was detected appearing on those same prompts starting May 13.

INFERENCE: This drop is likely driven by Perplexity increasing citations of a competitor who recently updated their location entity data. Fixing your Google Business Profile structured data for the downtown Austin location is the highest-priority recommended action.`,
  },
];

function DirectAgentSection() {
  return (
    <Section id="direct-agent" bg="bg-[#FAFAF8]" className="border-b border-[#EEEEEA]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left copy */}
        <div>
          <Eyebrow>Direct Agent</Eyebrow>
          <H2 className="mb-4">Ask anything. Get answers grounded in your data.</H2>
          <Body className="mb-6 max-w-[460px]">
            The Direct Agent is your AI analyst — but one that only speaks from evidence. It reads your actual scan data and clearly separates what is factual from what it is inferring. No hallucinations about your business.
          </Body>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "Answers grounded in your real visibility scan data",
              "Clearly labels EVIDENCE vs. INFERENCE",
              "Identifies root causes behind Direct Score changes",
              "Recommends specific fixes based on your actual gaps",
              "Suggests which prompts to prioritize next scan",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#777773]">
                <CheckCircle2 size={15} className="text-[#171717] shrink-0 mt-0.5" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <div className="bg-white rounded-xl border border-[#E5E5E1] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A0] mb-3">
              Example questions
            </p>
            {[
              "Why is my Direct Score this low?",
              "Which competitor is beating me most often?",
              "What should I fix first this week?",
              "Why does ChatGPT recommend them instead of us?",
            ].map((q) => (
              <div
                key={q}
                className="flex items-center gap-2 py-2 border-b border-[#F5F5F2] last:border-0 text-[13px] text-[#777773]"
              >
                <ChevronRight size={12} className="text-[#A3A3A0] shrink-0" aria-hidden="true" />
                {q}
              </div>
            ))}
          </div>
        </div>

        {/* Right — chat mock */}
        <div className="bg-white rounded-2xl border border-[#E5E5E1] overflow-hidden">
          {/* Chat header */}
          <div className="border-b border-[#EEEEEA] px-5 py-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#171717] flex items-center justify-center shrink-0">
              <Bot size={13} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#171717]">Direct Agent</p>
              <p className="text-[10px] text-[#A3A3A0]">Grounded in your visibility data</p>
            </div>
          </div>

          {/* Messages */}
          <div className="p-5 flex flex-col gap-4 bg-[#FAFAF8]">
            {AGENT_MESSAGES.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    m.role === "user" ? "bg-[#171717]" : "bg-white border border-[#E5E5E1]"
                  }`}
                >
                  {m.role === "user" ? (
                    <span className="text-[8px] font-bold text-white">YOU</span>
                  ) : (
                    <Bot size={11} className="text-[#777773]" aria-hidden="true" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#171717] text-white rounded-tr-sm"
                      : "bg-white border border-[#E5E5E1] text-[#171717] rounded-tl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-[#E5E5E1] p-4 flex gap-2 bg-white">
            <div className="flex-1 bg-[#FAFAF8] border border-[#E5E5E1] rounded-lg px-3 py-2 text-[12px] text-[#A3A3A0]">
              Ask about your AI visibility…
            </div>
            <button
              className="bg-[#171717] text-white w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#2A2A2A] transition-colors"
              aria-label="Send message"
            >
              <Send size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ── Tab content components ─────────────────────────────────────────────────

function VisibilityTabContent() {
  const providerData = [
    { name: "ChatGPT", score: 82, mentions: 9, total: 10, color: "#10B981" },
    { name: "Claude", score: 74, mentions: 7, total: 10, color: "#8B5CF6" },
    { name: "Perplexity", score: 68, mentions: 6, total: 10, color: "#3B82F6" },
    { name: "Gemini", score: 51, mentions: 5, total: 10, color: "#EF4444" },
    { name: "Google AI", score: 44, mentions: 4, total: 10, color: "#EAB308" },
  ];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
      <div>
        <Eyebrow>AI Visibility</Eyebrow>
        <H2 className="mb-4">See exactly where AI recommends your business.</H2>
        <Body className="mb-6 max-w-[460px]">Every scan queries the AI platforms that buyers actually use. You see a Direct Score, a platform-by-platform breakdown, and exactly which prompts you win or lose.</Body>
        <ul className="flex flex-col gap-3 mb-8">
          {["Direct Score — your single AI visibility number out of 100","Visibility breakdown by ChatGPT, Claude, Perplexity, Gemini, and Google AI","Historical trend tracking across every scan","Win/loss analysis per buyer-intent prompt"].map(i=>(
            <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#777773]"><CheckCircle2 size={15} className="text-[#171717] shrink-0 mt-0.5" aria-hidden="true" />{i}</li>
          ))}
        </ul>
        <Link href="/signup" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#171717] hover:underline underline-offset-2">Get your free visibility score <ArrowRight size={13} /></Link>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E5E1] p-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[{label:"Direct Score",value:"82",sub:"/ 100",icon:Target,trend:"+12 pts"},{label:"Prompts Won",value:"10/12",sub:"83%",icon:Trophy,trend:"+3"},{label:"Citation Rate",value:"64%",sub:"avg: 48%",icon:Quote,trend:"+18%"}].map(({label,value,sub,icon:Icon,trend})=>(
            <div key={label} className="bg-[#FAFAF8] rounded-xl border border-[#E5E5E1] p-3.5">
              <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{label}</span><Icon size={12} className="text-[#D4D4CF]" aria-hidden="true"/></div>
              <div className="flex items-baseline gap-1 mb-0.5"><p className="text-[18px] font-bold text-[#171717] leading-none">{value}</p><p className="text-[11px] text-[#A3A3A0]">{sub}</p></div>
              <span className="text-[11px] font-semibold text-[#166534]">↑ {trend}</span>
            </div>
          ))}
        </div>
        <div className="bg-[#FAFAF8] rounded-xl border border-[#E5E5E1] p-4 mb-4">
          <div className="flex items-center justify-between mb-3"><p className="text-[13px] font-semibold text-[#171717]">Visibility trend</p><span className="text-[11px] text-[#A3A3A0]">Last 10 scans</span></div>
          <MiniChart h={72} />
        </div>
        <div className="bg-[#FAFAF8] rounded-xl border border-[#E5E5E1] p-4">
          <p className="text-[13px] font-semibold text-[#171717] mb-3">Platform breakdown</p>
          <div className="flex flex-col gap-2.5">
            {providerData.map(({name,score,mentions,total,color})=>(
              <div key={name} className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#171717] w-24 shrink-0"><PlatformIcon platform={name} size={14}/>{name}</span>
                <div className="flex-1 h-1.5 bg-[#EEEEEA] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${score}%`,backgroundColor:color}}/></div>
                <span className="text-[11px] font-semibold text-[#777773] w-12 text-right shrink-0 tabular-nums">{mentions}/{total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompetitorsTabContent() {
  const competitors = [{name:"Your business",score:47,delta:"+5%",isYou:true},{name:"Competitor A",score:65,delta:"-2%",isYou:false},{name:"Competitor B",score:62,delta:"+1%",isYou:false},{name:"Competitor C",score:34,delta:"-4%",isYou:false}];
  const promptWins = [{prompt:"Best mountain bike shop near me",you:true,them:false},{prompt:"Top-rated bike repair service",you:false,them:true},{prompt:"Full suspension bike under $4,000",you:true,them:true},{prompt:"Kids bike fitting specialists",you:false,them:true},{prompt:"Bike rental for weekend trails",you:true,them:false}];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
      <div className="bg-white rounded-2xl border border-[#E5E5E1] p-5">
        <p className="text-[13px] font-semibold text-[#171717] mb-4">AI visibility — head-to-head</p>
        <div className="flex flex-col gap-2.5 mb-5">
          {competitors.map(({name,score,delta,isYou})=>(
            <div key={name} className="flex items-center gap-3">
              <span className={`text-[12px] font-medium w-28 shrink-0 truncate ${isYou?"text-[#171717] font-semibold":"text-[#777773]"}`}>{name}</span>
              <div className="flex-1 h-2 bg-[#F0F0EC] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${score}%`,backgroundColor:isYou?"#171717":"#D4D4CF"}}/></div>
              <span className={`text-[11px] font-semibold w-6 text-right tabular-nums ${isYou?"text-[#171717]":"text-[#A3A3A0]"}`}>{score}</span>
              <span className={`text-[10px] font-medium w-8 text-right tabular-nums ${delta.startsWith("+")?"text-[#166534]":"text-[#991B1B]"}`}>{delta}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-semibold text-[#A3A3A0] mb-2.5 uppercase tracking-wider">Prompt win/loss</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="border-b border-[#EEEEEA]"><th className="text-left font-semibold text-[#A3A3A0] pb-2 pr-4">Prompt</th><th className="text-center font-semibold text-[#171717] pb-2 px-3">You</th><th className="text-center font-semibold text-[#A3A3A0] pb-2 px-3">Comp A</th></tr></thead>
            <tbody>{promptWins.map(({prompt,you,them})=>(
              <tr key={prompt} className="border-b border-[#F5F5F2]">
                <td className="py-2 pr-4 text-[#777773] max-w-[180px] truncate">{prompt}</td>
                <td className="py-2 px-3 text-center">{you?<CheckCircle2 size={13} className="text-[#166534] mx-auto" aria-label="Won"/>:<XCircle size={13} className="text-[#D4D4CF] mx-auto" aria-label="Lost"/>}</td>
                <td className="py-2 px-3 text-center">{them?<CheckCircle2 size={13} className="text-[#991B1B] mx-auto" aria-label="Competitor won"/>:<XCircle size={13} className="text-[#D4D4CF] mx-auto" aria-label="Competitor lost"/>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div>
        <Eyebrow>Competitive Intelligence</Eyebrow>
        <H2 className="mb-4">Know who AI recommends instead of you.</H2>
        <Body className="mb-6 max-w-[460px]">See every competitor AI favors across your tracked prompts. Understand which categories they dominate, where you win, and what changes would shift the result.</Body>
        <ul className="flex flex-col gap-3 mb-8">
          {["Tracked competitor list with per-prompt breakdown","Head-to-head AI visibility percentage comparison","Prompt-level win/loss vs. every competitor","Changes between scans — see when gaps close or widen","Turn competitor gaps into actionable Opportunities"].map(i=>(
            <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#777773]"><CheckCircle2 size={15} className="text-[#171717] shrink-0 mt-0.5" aria-hidden="true"/>{i}</li>
          ))}
        </ul>
        <Link href="/signup" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#171717] hover:underline underline-offset-2">See your competitor analysis <ArrowRight size={13}/></Link>
      </div>
    </div>
  );
}

function SourcesTabContent() {
  const sources = [{rank:1,domain:"reddit.com",type:"UGC",used:"32%",avgCitations:"3.2",isYou:false},{rank:2,domain:"yourbusiness.com",type:"You",used:"43%",avgCitations:"5.2",isYou:true},{rank:3,domain:"wikipedia.org",type:"Reference",used:"31%",avgCitations:"1.4",isYou:false},{rank:4,domain:"hubspot.com",type:"Competitor",used:"39%",avgCitations:"1.1",isYou:false},{rank:5,domain:"techradar.com",type:"Editorial",used:"45%",avgCitations:"2.4",isYou:false}];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
      <div>
        <Eyebrow>Citations & Sources</Eyebrow>
        <H2 className="mb-4">Find the sources shaping AI answers.</H2>
        <Body className="mb-6 max-w-[460px]">AI systems cite specific websites when constructing answers. Customers.Direct reveals which domains are cited most, whether your site appears, and where competitors have citation advantages you can close.</Body>
        <ul className="flex flex-col gap-3 mb-8">
          {["Full citation source list with appearance counts","Your domain vs. competitor domain citation comparison","Gap analysis — sources citing competitors but not you","Source type classification: review, directory, editorial, UGC"].map(i=>(
            <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#777773]"><CheckCircle2 size={15} className="text-[#171717] shrink-0 mt-0.5" aria-hidden="true"/>{i}</li>
          ))}
        </ul>
      </div>
      <div className="bg-[#FAFAF8] rounded-2xl border border-[#E5E5E1] p-5">
        <div className="bg-white rounded-xl border border-[#E5E5E1] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EEEEEA] flex items-center justify-between"><p className="text-[13px] font-semibold text-[#171717]">Top cited sources</p><span className="text-[11px] text-[#A3A3A0]">Latest scan</span></div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-[#EEEEEA] bg-[#FAFAF8]">
                <th className="text-left font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">#</th>
                <th className="text-left font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">Domain</th>
                <th className="text-left font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">Type</th>
                <th className="text-right font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">Used</th>
                <th className="text-right font-semibold text-[#A3A3A0] uppercase tracking-wider text-[10px] px-4 py-2.5">Avg cites</th>
              </tr></thead>
              <tbody className="divide-y divide-[#EEEEEA]">
                {sources.map(({rank,domain,type,used,avgCitations,isYou})=>(
                  <tr key={domain} className={isYou?"bg-[#F0FDF4]/60":"hover:bg-[#FAFAF8]"}>
                    <td className="px-4 py-2.5 text-[#A3A3A0] tabular-nums">{rank}</td>
                    <td className="px-4 py-2.5"><span className={`font-semibold ${isYou?"text-[#166534]":"text-[#171717]"}`}>{domain}{isYou?" ★":""}</span></td>
                    <td className="px-4 py-2.5"><SourceBadge type={type}/></td>
                    <td className="px-4 py-2.5 text-right text-[#777773] tabular-nums">{used}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#171717] tabular-nums">{avgCitations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2.5 bg-[#171717] text-white rounded-xl px-4 py-3">
          <CheckCircle2 size={14} className="text-[#22C55E] shrink-0" aria-hidden="true"/>
          <p className="text-[12px] font-medium">5 source opportunities found</p>
          <ExternalLink size={11} className="text-white/40 ml-auto shrink-0" aria-hidden="true"/>
        </div>
      </div>
    </div>
  );
}

function OpportunitiesTabContent() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
      <div className="lg:sticky lg:top-24">
        <Eyebrow>Opportunities</Eyebrow>
        <H2 className="mb-4">Know exactly what to fix next.</H2>
        <Body className="mb-6 max-w-[460px]">Every opportunity is generated from real scan evidence — not generic advice. Each one includes the specific issue, why it matters, and a recommended action. Where the fix involves content or code, you get a ready-made prompt to send to Claude.</Body>
        <div className="bg-[#FAFAF8] rounded-xl border border-[#E5E5E1] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A0] mb-3">The improvement loop</p>
          {[{step:"01",label:"Detect",desc:"AI scans identify gaps and missed prompts"},{step:"02",label:"Explain",desc:"Evidence-backed opportunity cards surface"},{step:"03",label:"Fix",desc:"Recommended action + Claude prompt provided"},{step:"04",label:"Rescan",desc:"Run a new scan after implementing the fix"},{step:"05",label:"Measure",desc:"Direct Score reflects the improvement"}].map(({step,label,desc})=>(
            <div key={step} className="flex items-start gap-3 py-2.5 border-b border-[#EEEEEA] last:border-0">
              <span className="text-[10px] font-bold text-[#777773] bg-[#F0F0EC] border border-[#E5E5E1] rounded-md w-7 h-7 flex items-center justify-center shrink-0 mt-0.5 tabular-nums">{step}</span>
              <div><p className="text-[13px] font-semibold text-[#171717]">{label}</p><p className="text-[11px] text-[#777773]">{desc}</p></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {SAMPLE_OPPORTUNITIES.map(({impact,title,evidence,action,badgeColor})=>(
          <div key={title} className="bg-white rounded-xl border border-[#E5E5E1] p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 mt-0.5 ${badgeColor}`}>{impact} impact</span>
              <h3 className="text-[14px] font-semibold text-[#171717] leading-snug">{title}</h3>
            </div>
            <div className="bg-[#FAFAF8] rounded-lg px-3 py-2.5 mb-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A0] mb-1">Evidence</p><p className="text-[12px] text-[#777773]">{evidence}</p></div>
            <p className="text-[12px] text-[#171717] mb-3"><span className="font-semibold">Recommended: </span>{action}</p>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#777773] bg-[#F5F5F2] border border-[#E5E5E1] px-3 py-1.5 rounded-lg hover:bg-[#EEEEEA] transition-colors"><Copy size={11} aria-hidden="true"/>Copy for Claude</button>
              <button className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#171717] px-3 py-1.5 rounded-lg hover:bg-[#2A2A2A] transition-colors"><Zap size={11} aria-hidden="true"/>Request fix</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentTabContent() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
      <div>
        <Eyebrow>Direct Agent</Eyebrow>
        <H2 className="mb-4">Ask anything. Get answers grounded in your data.</H2>
        <Body className="mb-6 max-w-[460px]">The Direct Agent is your AI analyst — but one that only speaks from evidence. It reads your actual scan data and clearly separates what is factual from what it is inferring. No hallucinations about your business.</Body>
        <ul className="flex flex-col gap-3 mb-8">
          {["Answers grounded in your real visibility scan data","Clearly labels EVIDENCE vs. INFERENCE","Identifies root causes behind Direct Score changes","Recommends specific fixes based on your actual gaps","Suggests which prompts to prioritize next scan"].map(i=>(
            <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#777773]"><CheckCircle2 size={15} className="text-[#171717] shrink-0 mt-0.5" aria-hidden="true"/>{i}</li>
          ))}
        </ul>
        <div className="bg-white rounded-xl border border-[#E5E5E1] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A0] mb-3">Example questions</p>
          {["Why is my Direct Score this low?","Which competitor is beating me most often?","What should I fix first this week?","Why does ChatGPT recommend them instead of us?"].map(q=>(
            <div key={q} className="flex items-center gap-2 py-2 border-b border-[#F5F5F2] last:border-0 text-[13px] text-[#777773]"><ChevronRight size={12} className="text-[#A3A3A0] shrink-0" aria-hidden="true"/>{q}</div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E5E1] overflow-hidden">
        <div className="border-b border-[#EEEEEA] px-5 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#171717] flex items-center justify-center shrink-0"><Bot size={13} className="text-white" aria-hidden="true"/></div>
          <div><p className="text-[13px] font-semibold text-[#171717]">Direct Agent</p><p className="text-[10px] text-[#A3A3A0]">Grounded in your visibility data</p></div>
        </div>
        <div className="p-5 flex flex-col gap-4 bg-[#FAFAF8]">
          {AGENT_MESSAGES.map((m,i)=>(
            <div key={i} className={`flex gap-3 ${m.role==="user"?"flex-row-reverse":""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role==="user"?"bg-[#171717]":"bg-white border border-[#E5E5E1]"}`}>
                {m.role==="user"?<span className="text-[8px] font-bold text-white">YOU</span>:<Bot size={11} className="text-[#777773]" aria-hidden="true"/>}
              </div>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap ${m.role==="user"?"bg-[#171717] text-white rounded-tr-sm":"bg-white border border-[#E5E5E1] text-[#171717] rounded-tl-sm"}`}>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#E5E5E1] p-4 flex gap-2 bg-white">
          <div className="flex-1 bg-[#FAFAF8] border border-[#E5E5E1] rounded-lg px-3 py-2 text-[12px] text-[#A3A3A0]">Ask about your AI visibility…</div>
          <button className="bg-[#171717] text-white w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#2A2A2A] transition-colors" aria-label="Send message"><Send size={13} aria-hidden="true"/></button>
        </div>
      </div>
    </div>
  );
}

// ─── 8. AGENCY / RESELLER ──────────────────────────────────────────────────

function AgencySection() {
  return (
    <Section id="agencies" bg="bg-[#171717]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left copy */}
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/50 bg-white/8 border border-white/12 px-3 py-1 rounded-full mb-5 uppercase tracking-wider">
            Agencies & Resellers
          </div>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-white leading-[1.1] tracking-tight mb-4">
            Manage every client&apos;s AI visibility from one login.
          </h2>
          <p className="text-[15px] text-white/50 leading-relaxed mb-6 max-w-[460px]">
            Customers.Direct is built for agencies from the ground up. One login. Multiple client workspaces. You own the billing relationship — your clients never see a Customers.Direct invoice.
          </p>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "One login → unlimited client businesses",
              "Per-business subscriptions billed to you, not your client",
              "Business switcher for seamless client switching",
              "Repeatable reporting workflow per client",
              "Actionable opportunities for each client business",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-white/50">
                <CheckCircle2 size={15} className="text-white/40 shrink-0 mt-0.5" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-white text-[#171717] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#F5F5F2] transition-colors text-[14px] active:scale-[0.97]"
            >
              Start free — add clients later <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Right — agency workspace mock */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 overflow-hidden"
          style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>

          {/* Header bar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8">
            {/* Agency logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/Workspace/brandastic.jpg"
              alt="Brandastic Agency"
              className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0"
            />
            <span className="text-[15px] font-bold text-white tracking-tight">Brandastic Agency</span>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-[#4F8EF7] bg-[#4F8EF7]/15 border border-[#4F8EF7]/30 px-2.5 py-1 rounded-md">
              Agency Workspace
            </span>
          </div>

          {/* Body: brands list + metrics */}
          <div className="flex">
            {/* Left — brand list */}
            <div className="w-[200px] shrink-0 border-r border-white/8 py-4 px-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-3 px-2">Your Brands</p>
              <div className="flex flex-col gap-1">
                {[
                  {
                    name: "UFC Gym",
                    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/Workspace/ufcgym-square-black.jpg",
                    active: true,
                  },
                  {
                    name: "Microsoft",
                    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/Workspace/Microsoft-Logo.png",
                    active: false,
                  },
                  {
                    name: "T-Mobile",
                    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/Workspace/T-Mobile-Logo.png",
                    active: false,
                  },
                  {
                    name: "Vans",
                    src: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/Workspace/vans-logo-png_seeklogo-147508.png",
                    active: false,
                  },
                ].map(({ name, src, active }) => (
                  <div
                    key={name}
                    className={`flex items-center gap-3 px-2 py-2.5 rounded-xl ${active ? "bg-white/10" : ""}`}
                  >
                    {/* Logo with black bg */}
                    <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={name} className="w-9 h-9 object-contain" />
                    </div>
                    <span className={`text-[14px] font-semibold truncate ${active ? "text-white" : "text-white/45"}`}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — metrics for active brand */}
            <div className="flex-1 p-4 flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                {/* AI Visibility */}
                <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <img src="/icons/ai-platforms/chatgpt.svg" alt="" width={12} height={12} className="opacity-40 invert" aria-hidden="true" />
                    <p className="text-[9px] text-white/35 uppercase tracking-wide">AI Visibility</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-[26px] font-bold text-white leading-none">82</span>
                    <svg width="40" height="18" viewBox="0 0 40 18" fill="none" className="mb-1" aria-hidden="true">
                      <polyline points="0,15 8,11 16,13 24,6 32,8 40,2" stroke="#4F8EF7" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {/* Prompts Won */}
                <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <img src="/icons/ai-platforms/perplexity.svg" alt="" width={12} height={12} className="opacity-40 invert" aria-hidden="true" />
                    <p className="text-[9px] text-white/35 uppercase tracking-wide">Prompts Won</p>
                  </div>
                  <span className="text-[26px] font-bold text-white leading-none">10/12</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Competitors */}
                <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <img src="/icons/ai-platforms/gemini.svg" alt="" width={12} height={12} className="opacity-40 invert" aria-hidden="true" />
                    <p className="text-[9px] text-white/35 uppercase tracking-wide">Competitors</p>
                  </div>
                  <span className="text-[20px] font-bold text-white leading-none">5 tracked</span>
                </div>
                {/* Open Opportunities */}
                <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <img src="/icons/ai-platforms/google.svg" alt="" width={12} height={12} className="opacity-40 invert" aria-hidden="true" />
                    <p className="text-[9px] text-white/35 uppercase tracking-wide">Open Opps</p>
                  </div>
                  <span className="text-[26px] font-bold text-white leading-none">3</span>
                </div>
              </div>
              {/* Last scan */}
              <div className="bg-white/6 rounded-xl border border-white/8 px-3 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <img src="/icons/ai-platforms/chatgpt-dark.svg" alt="" width={12} height={12} className="opacity-40 invert" aria-hidden="true" />
                  <p className="text-[9px] text-white/35 uppercase tracking-wide">Last scan</p>
                </div>
                <span className="text-[18px] font-bold text-white leading-none">2 hrs ago</span>
              </div>
            </div>
          </div>

          {/* Billing note */}
          <div className="flex items-start gap-2.5 bg-white/4 border-t border-white/8 px-5 py-3.5">
            <Building2 size={13} className="text-white/30 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[11.5px] text-white/40 leading-snug">
              <span className="font-semibold text-white/60">Agency billing:</span> You pay Customers.Direct monthly. Your clients never see our invoices.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── 9. PRICING ───────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "ai_visibility",
    name: "AI Visibility",
    price: "$497",
    period: "/month",
    description: "See where you stand today.",
    features: [
      "1 business tracked",
      "~50 buyer-intent prompts monitored",
      "Monthly monitoring runs",
      "Direct Score + competitor comparison",
      "Opportunity recommendations",
      '"Send to Claude" implementation packages',
    ],
    cta: "Start AI Visibility",
    highlight: false,
  },
  {
    id: "growth_agent",
    name: "Growth Agent",
    price: "$997",
    period: "/month",
    badge: "Most Popular",
    description: "Track it weekly and go deeper.",
    features: [
      "Everything in AI Visibility",
      "Weekly monitoring runs",
      "~100 buyer-intent prompts monitored",
      "Deeper competitive analysis",
      "Full GEO audit of your site",
      "Priority opportunity generation",
    ],
    cta: "Start Growth Agent",
    highlight: true,
  },
  {
    id: "autonomous_growth",
    name: "Autonomous Growth",
    price: "From $1,997",
    period: "/month",
    description: "We implement the fixes for you.",
    features: [
      "Everything in Growth Agent",
      "Customers.Direct executes approved changes",
      "Human-in-the-loop approval workflow",
      "Priority implementation queue",
      "Dedicated account oversight",
    ],
    cta: "Talk to Us",
    highlight: false,
  },
];

function PricingSection() {
  return (
    <Section id="pricing" bg="bg-white" className="border-t border-[#EEEEEA]">
      <div className="text-center mb-14">
        <Eyebrow>Pricing</Eyebrow>
        <H2 className="mb-4">Pick the level of help you need.</H2>
        <Body className="max-w-xl mx-auto">
          Start with a free visibility score. Upgrade for continuous monitoring, competitor tracking, opportunities, and the Direct Agent.
        </Body>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border flex flex-col p-8 ${
              plan.highlight
                ? "bg-[#171717] border-[#171717] text-white"
                : "bg-white border-[#E5E5E1]"
            }`}
            style={
              plan.highlight
                ? { boxShadow: "0 20px 48px rgba(23,23,23,0.22)" }
                : undefined
            }
          >
            {plan.badge && (
              <span className="absolute -top-3 left-7 bg-[#171717] text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border border-white/20">
                {plan.badge}
              </span>
            )}

            <p className={`text-[10px] font-bold uppercase tracking-widest mb-5 ${plan.highlight ? "text-white/50" : "text-[#A3A3A0]"}`}>
              {plan.name}
            </p>

            <div className="flex items-end gap-1 mb-2">
              <span className="text-[38px] font-bold leading-none tracking-tight">{plan.price}</span>
              <span className={`text-sm mb-1 ${plan.highlight ? "text-white/50" : "text-[#A3A3A0]"}`}>{plan.period}</span>
            </div>
            <p className={`text-sm mb-7 leading-relaxed ${plan.highlight ? "text-white/60" : "text-[#777773]"}`}>
              {plan.description}
            </p>

            <div className="flex flex-col gap-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2.5">
                  <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    plan.highlight ? "bg-white/10" : "bg-[#F0F0EC]"
                  }`}>
                    <Check size={10} className={plan.highlight ? "text-white" : "text-[#777773]"} aria-hidden="true" />
                  </div>
                  <span className={`text-[13px] leading-snug ${plan.highlight ? "text-white/75" : "text-[#777773]"}`}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className={`flex items-center justify-center gap-2 font-semibold py-3 rounded-lg transition-all text-sm active:scale-[0.97] ${
                plan.highlight
                  ? "bg-white text-[#171717] hover:bg-[#F0F0EC]"
                  : "bg-[#171717] text-white hover:bg-[#2A2A2A]"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="max-w-2xl mx-auto mt-10 flex items-start gap-3 bg-[#F5F5F2] border border-[#E5E5E1] rounded-xl px-5 py-4">
        <Zap size={15} className="text-[#A3A3A0] shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[12px] text-[#777773] leading-relaxed">
          <strong className="text-[#555552]">No guaranteed AI rankings — ever.</strong> AI models change constantly and no company can promise a specific mention, position, or outcome inside ChatGPT, Claude, Perplexity, or any other AI product. Customers.Direct measures your visibility honestly and helps you improve the factors within your control.
        </p>
      </div>
    </Section>
  );
}

// ─── 10. FINAL CTA ────────────────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section className="bg-[#FAFAF8] py-24 px-4 border-t border-[#EEEEEA]">
      <div className="max-w-[1160px] mx-auto text-center">
        <H2 className="mb-4">
          Know where your business stands in AI search.
        </H2>
        <Body className="mb-8 max-w-xl mx-auto">
          See what AI recommends, why competitors appear, and what to fix next. No credit card required.
        </Body>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <PrimaryBtn href="/signup">
            Check My AI Visibility
            <ArrowRight size={14} aria-hidden="true" />
          </PrimaryBtn>
          <SecondaryBtn href="/#how-it-works">
            See how it works
          </SecondaryBtn>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#A3A3A0]">
          {["Free visibility score", "Set up in minutes", "Cancel anytime"].map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <Check size={12} className="text-[#777773] shrink-0" aria-hidden="true" />
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 10. HOW IT WORKS ─────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    num: "01",
    title: "Connect your business",
    body: "Tell us your website and business details. We pull what we can automatically — you confirm or correct it. Takes about two minutes.",
    image: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/steps/ChatGPT%20Image%20Aug%2026,%202026,%2002_16_54%20PM%20(1).png",
  },
  {
    num: "02",
    title: "We run your first AI scan",
    body: "Customers.Direct fires real buyer-intent prompts at ChatGPT, Claude, Perplexity, Gemini, and Google AI. We record every mention, ranking, and citation.",
    image: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/steps/ChatGPT%20Image%20Aug%2026,%202026,%2002_16_54%20PM%20(2).png",
  },
  {
    num: "03",
    title: "See your visibility vs. competitors",
    body: "Your Direct Score shows exactly where AI recommends your business, what competitors appear instead, and which sources are shaping the answers.",
    image: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/steps/ChatGPT%20Image%20Aug%2026,%202026,%2002_16_55%20PM%20(3).png",
  },
  {
    num: "04",
    title: "Fix what matters, track the change",
    body: "Every opportunity comes with evidence and a ready-made Claude prompt. Request us to implement it, or do it yourself — then watch your score move.",
    image: "https://wsxusvapciexemfvtadm.supabase.co/storage/v1/object/public/STORAGE/images/steps/ChatGPT%20Image%20Aug%2026,%202026,%2002_16_55%20PM%20(4).png",
  },
];

function HowItWorksSection() {
  return (
    <Section id="how-it-works" bg="bg-[#FAFAF8]" className="border-t border-[#EEEEEA]">
      <div className="text-center mb-14">
        <Eyebrow>How It Works</Eyebrow>
        <H2 className="mb-4">From sign-up to insight in minutes.</H2>
        <Body className="max-w-xl mx-auto">
          No long setup. No guesswork. Your first AI visibility scan runs automatically after a two-minute onboarding.
        </Body>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#E5E5E1] rounded-2xl overflow-hidden border border-[#E5E5E1]">
        {HOW_STEPS.map((step, i) => (
          <div key={step.num} className="bg-white flex flex-col relative">
            {/* Image */}
            <div className="w-full aspect-square overflow-hidden bg-[#F5F5F2]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={step.image}
                alt={step.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-8 flex flex-col gap-3 flex-1">
              {/* Step number */}
              <span className="text-[11px] font-bold text-[#A3A3A0] tracking-widest uppercase">{step.num}</span>
              {/* Connector dot — desktop only */}
              {i < HOW_STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-[calc(50%-5px)] -right-[5px] w-2.5 h-2.5 rounded-full bg-[#E5E5E1] border-2 border-white z-10" aria-hidden="true" />
              )}
              <h3 className="text-[15px] font-semibold text-[#171717] leading-snug">{step.title}</h3>
              <p className="text-[13px] text-[#777773] leading-relaxed flex-1">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── 11. FAQ ──────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Can you guarantee my business will show up in ChatGPT or Google AI Overviews?",
    a: "No — and be skeptical of anyone who says they can. AI models are controlled by OpenAI, Google, Anthropic, and other providers, not by us. We measure your current visibility honestly, show you the evidence behind it, and help you improve the factors that are actually within your control: your content, structured data, citations, and online presence.",
  },
  {
    q: "How is this different from traditional SEO tools?",
    a: "Traditional SEO tools track search engine rankings. Customers.Direct runs real buyer-intent prompts against AI providers (like ChatGPT and Claude) and reports what those models actually say — whether your business is mentioned, where competitors show up instead, and what's cited as a source.",
  },
  {
    q: "Do you use the actual ChatGPT or Claude chat apps to test this?",
    a: "We use each provider's official API, which is the standard, reliable way to test model behaviour programmatically. API responses can differ from what you'd see typing into the consumer chat app — we label our methodology clearly on every result so you know exactly how it was produced.",
  },
  {
    q: "What happens after I sign up?",
    a: "You'll give us your website, we'll scan it and pull the details we can find automatically, you'll confirm or correct them, we'll suggest a handful of competitors and prompts to track, and then we run your first visibility scan. You can review and adjust everything before it's finalized — nothing is auto-confirmed on your behalf.",
  },
  {
    q: "What's the difference between the plans?",
    a: "AI Visibility gives you monthly measurement and reporting for one business. Growth Agent adds weekly monitoring, more prompts, and deeper competitive analysis. Autonomous Growth adds hands-on implementation — our team executes approved fixes for you instead of you or your developer doing it.",
  },
  {
    q: "Is this right for agencies managing multiple clients?",
    a: "Yes. One login gives you access to multiple business workspaces. Each business has its own scan data, prompts, competitors, and reports. You switch between clients from the dashboard sidebar without logging in and out.",
  },
];

function FAQSection() {
  return (
    <Section id="faq" bg="bg-white" className="border-t border-[#EEEEEA]">
      <div className="text-center mb-14">
        <Eyebrow>FAQ</Eyebrow>
        <H2>Questions, answered honestly.</H2>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col divide-y divide-[#EEEEEA] border border-[#E5E5E1] rounded-2xl overflow-hidden">
        {FAQS.map((item) => (
          <FAQItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </Section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-4 px-6 py-5 text-left hover:bg-[#FAFAF8] transition-colors"
        aria-expanded={open}
      >
        <span className="text-[14px] font-semibold text-[#171717] leading-snug">{q}</span>
        <ChevronRight
          size={15}
          className={`text-[#A3A3A0] shrink-0 mt-0.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="px-6 pb-5 -mt-1">
          <p className="text-[13px] text-[#777773] leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: "We had no idea ChatGPT was sending customers to our competitors. One scan showed us exactly why — and we fixed it within a week. New bookings are up noticeably.",
    name: "Sarah M.",
    role: "Owner",
    company: "Bloom Hair Studio",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces&q=80",
  },
  {
    quote: "Our Perplexity visibility was zero. Customers.Direct showed us the three sources AI kept citing instead of us. We got listed on two of them — new members started mentioning finding us through AI search.",
    name: "Marcus T.",
    role: "Marketing Director",
    company: "Peak Fitness",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces&q=80",
  },
  {
    quote: "I was skeptical that AI chatbots mattered for a dental practice. Turns out over a third of our new patient inquiries now mention searching AI first. This platform helped us show up in those answers.",
    name: "Dr. Jennifer K.",
    role: "Practice Owner",
    company: "Lakeside Dental",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=faces&q=80",
  },
  {
    quote: "The competitor comparison was eye-opening. A shop down the street had 3× our AI visibility. We used the opportunity recommendations and closed the gap in about 60 days.",
    name: "Chris R.",
    role: "Owner",
    company: "Precision Auto Care",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=faces&q=80",
  },
  {
    quote: "We manage 12 local businesses. Customers.Direct is the only tool that gives us a repeatable process to measure and improve AI search visibility for every client. Game-changer for agency reporting.",
    name: "Tanya L.",
    role: "Agency Director",
    company: "Northside Digital",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces&q=80",
  },
  {
    quote: "I asked ChatGPT 'who's the best roofer in Austin' and we weren't even in the answer. That was the wake-up call. After using this platform we started appearing — and saw a measurable lift in quote requests.",
    name: "James A.",
    role: "CEO",
    company: "Ridgeline Roofing",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=faces&q=80",
  },
];

function TestimonialsSection() {
  return (
    <Section id="testimonials" bg="bg-[#FAFAF8]" className="border-t border-[#EEEEEA]">
      <div className="text-center mb-14">
        <Eyebrow>From our customers</Eyebrow>
        <H2>Businesses already winning in AI search.</H2>
        <Body className="mt-4 max-w-xl mx-auto">
          Real results from business owners and agencies using Customers.Direct to track, understand, and improve their AI visibility.
        </Body>
      </div>

      {/* Masonry-style 3-col grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={i}
            className="break-inside-avoid bg-white border border-[#E5E5E1] rounded-2xl p-6 flex flex-col gap-4"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            {/* 5 stars */}
            <div className="flex gap-0.5" aria-label="5 out of 5 stars">
              {[...Array(5)].map((_, s) => (
                <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#171717" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </div>

            {/* Quote */}
            <p className="text-[14px] text-[#3D3D3A] leading-relaxed flex-1">
              &ldquo;{t.quote}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#EEEEEA]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.photo}
                alt={t.name}
                width={44}
                height={44}
                className="w-11 h-11 rounded-full object-cover shrink-0 border border-[#E5E5E1]"
              />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#171717] truncate">{t.name}</p>
                <p className="text-[11px] text-[#A3A3A0] truncate">
                  {t.role} · {t.company}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────

export default function HomepagePlatform() {
  return (
    <>
      <HeroSection />
      <BannerRotationSection />
      <PromptTrackingSection />
      <ProductTabsSection />
      <AgencySection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTASection />
    </>
  );
}
