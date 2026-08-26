"use client";

import Link from "next/link";
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
  AlertCircle,
  CheckCircle2,
  XCircle,
  Copy,
  Send,
  Building2,
  ChevronRight,
  Zap,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────

const blue = "#2563EB";

// ─── Shared layout primitives ────────────────────────────────────────────

function Section({
  id,
  bg = "bg-white",
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
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#2563EB] mb-3">{children}</p>
  );
}

function H2({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`text-3xl sm:text-[38px] font-black text-[#0F172A] leading-[1.08] tracking-tight ${className}`}>
      {children}
    </h2>
  );
}

function Body({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[16px] text-[#64748B] leading-relaxed ${className}`}>{children}</p>
  );
}

// ─── Dashboard mock primitives ────────────────────────────────────────────

const SCORE_HISTORY = [28, 33, 36, 42, 48, 55, 62, 68, 74, 82];

function MiniChart({ values = SCORE_HISTORY, color = blue, h = 48 }: { values?: number[]; color?: string; h?: number }) {
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
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── 1. HERO ─────────────────────────────────────────────────────────────

const AI_PLATFORMS = [
  { name: "ChatGPT", color: "#10B981" },
  { name: "Claude", color: "#7C3AED" },
  { name: "Perplexity", color: "#2563EB" },
  { name: "Gemini", color: "#EA4335" },
  { name: "Google AI", color: "#FBBC04" },
];

function HeroDashboardPreview() {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden w-full shadow-2xl"
    >
      <div className="flex" style={{ height: 360 }}>
        {/* Sidebar */}
        <div className="w-[120px] shrink-0 bg-white border-r border-slate-100 flex flex-col py-3">
          <div className="px-3 mb-4">
            <span className="text-[10px] font-black text-[#0F172A]">
              Customers<span className="text-[#2563EB]">.Direct</span>
            </span>
          </div>
          <div className="px-2 mb-3">
            <p className="text-[7px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5 px-1">Businesses</p>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5">
              <div className="w-3 h-3 rounded bg-amber-500 shrink-0" />
              <span className="text-[9px] font-semibold text-[#0F172A] truncate">1Billion.org</span>
            </div>
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            {[
              { label: "Dashboard", icon: LayoutDashboard, active: true },
              { label: "AI Insights", icon: BarChart3, active: false },
              { label: "Prompts", icon: MessagesSquare, active: false },
              { label: "Competitors", icon: Users, active: false },
              { label: "Opportunities", icon: Lightbulb, active: false },
            ].map(({ label, icon: Icon, active }) => (
              <div
                key={label}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[9px] font-medium ${
                  active ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#94A3B8]"
                }`}
              >
                <Icon size={9} />
                {label}
              </div>
            ))}
          </nav>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 bg-[#F8FAFC] p-3.5 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black text-[#0F172A]">Dashboard</p>
              <p className="text-[8px] text-[#94A3B8]">AI search visibility overview</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-[#64748B] bg-white border border-slate-200 px-2 py-1 rounded">Last 7 days</span>
              <button className="flex items-center gap-1 bg-[#2563EB] text-white text-[8px] font-bold px-2.5 py-1.5 rounded-md">
                <RefreshCw size={7} />
                Run Scan
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "DIRECT SCORE", value: "82", sub: "/ 100", trend: "+12", up: true },
              { label: "PROMPTS WON", value: "10/12", sub: "83%", trend: "+3", up: true },
              { label: "CITATION RATE", value: "64%", sub: "vs 48% avg", trend: "+18%", up: true },
            ].map(({ label, value, sub, trend, up }) => (
              <div key={label} className="bg-white rounded-lg border border-slate-200 p-2.5">
                <p className="text-[7px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-[15px] font-black text-[#0F172A] leading-none">{value}</p>
                  <p className="text-[8px] text-[#94A3B8]">{sub}</p>
                </div>
                <span className={`text-[8px] font-bold ${up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                  {up ? "↑" : "↓"} {trend}
                </span>
              </div>
            ))}
          </div>

          {/* Chart + Opportunities */}
          <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
            <div className="bg-white rounded-lg border border-slate-200 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-bold text-[#0F172A]">Direct Score trend</p>
                <span className="text-[7px] text-[#94A3B8]">10 scans</span>
              </div>
              <MiniChart h={80} />
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-2.5">
              <p className="text-[9px] font-bold text-[#0F172A] mb-2">Top opportunities</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { text: "Low AI mention rate", tag: "HIGH", color: "text-[#DC2626] bg-[#FEF2F2]" },
                  { text: "Missing buyer prompts", tag: "MED", color: "text-[#B45309] bg-[#FFFBEB]" },
                  { text: "Weak citation sources", tag: "MED", color: "text-[#B45309] bg-[#FFFBEB]" },
                ].map(({ text, tag, color }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${color}`}>{tag}</span>
                    <span className="text-[8px] text-[#475569] leading-tight">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Platform bar */}
          <div className="bg-white rounded-lg border border-slate-200 p-2.5">
            <p className="text-[8px] font-bold text-[#0F172A] mb-2">Platform visibility breakdown</p>
            <div className="flex gap-2">
              {[
                { name: "ChatGPT", val: 82, color: "#10B981" },
                { name: "Claude", val: 74, color: "#7C3AED" },
                { name: "Perplexity", val: 68, color: "#2563EB" },
                { name: "Gemini", val: 51, color: "#EA4335" },
              ].map(({ name, val, color }) => (
                <div key={name} className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[7px] text-[#64748B]">{name}</span>
                    <span className="text-[7px] font-bold" style={{ color }}>{val}</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="bg-[#F1F5F9] px-4 pt-14 pb-16 sm:pt-16 sm:pb-20 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-14 items-center">
          {/* Left */}
          <div className="fade-up">
            <Eyebrow>AI Search Visibility</Eyebrow>

            <h1 className="text-[44px] sm:text-[56px] font-black text-[#0F172A] leading-[1.03] tracking-tight mb-5">
              Customers.Direct helps AI send customers{" "}
              <span style={{ color: blue }}>directly</span>{" "}
              to your business.
            </h1>

            <Body className="mb-8 max-w-[500px]">
              Businesses are increasingly discovered through ChatGPT, Claude, Perplexity, Gemini,
              and Google AI. Customers.Direct shows where you appear, why competitors rank higher,
              and exactly what to improve.
            </Body>

            <div className="flex flex-wrap gap-3 mb-8">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-5 py-3 rounded-lg hover:bg-[#1d4ed8] transition-all duration-150 active:scale-[0.97] text-[15px]"
              >
                Check My AI Visibility — Free
                <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 bg-white text-[#0F172A] font-semibold px-5 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 text-[15px]"
              >
                See How It Works
              </Link>
            </div>

            {/* Micro-signals */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8">
              {["No credit card required", "Takes 2 minutes", "Free visibility score"].map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B]">
                  <Check size={13} className="text-[#2563EB] shrink-0" />
                  {s}
                </span>
              ))}
            </div>

            {/* Platform coverage */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-3">
                Tracks AI platforms
              </p>
              <div className="flex flex-wrap gap-2">
                {AI_PLATFORMS.map(({ name, color }) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#475569] bg-white border border-slate-200 px-2.5 py-1 rounded-md"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — dashboard preview */}
          <div className="fade-up fade-up-delay-2 lg:pl-2">
            <HeroDashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 2. AI VISIBILITY ─────────────────────────────────────────────────────

function AIVisibilitySection() {
  const providerData = [
    { name: "ChatGPT", score: 82, mentions: 9, total: 10, color: "#10B981" },
    { name: "Claude", score: 74, mentions: 7, total: 10, color: "#7C3AED" },
    { name: "Perplexity", score: 68, mentions: 6, total: 10, color: "#3B82F6" },
    { name: "Gemini", score: 51, mentions: 5, total: 10, color: "#EA4335" },
    { name: "Google AI", score: 44, mentions: 4, total: 10, color: "#FBBC04" },
  ];

  return (
    <Section id="ai-visibility" bg="bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left */}
        <div>
          <Eyebrow>AI Visibility</Eyebrow>
          <H2 className="mb-4">See exactly where AI recommends your business.</H2>
          <Body className="mb-6 max-w-[460px]">
            Every scan queries the AI platforms that buyers actually use. You see a Direct Score,
            platform-by-platform breakdown, and exactly which prompts you win or lose.
          </Body>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "Direct Score — your single AI visibility number out of 100",
              "Visibility breakdown by ChatGPT, Claude, Perplexity, Gemini, and Google AI",
              "Historical trend tracking across every scan",
              "Win/loss analysis per buyer-intent prompt",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#475569]">
                <CheckCircle2 size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
          >
            Get your free visibility score <ArrowRight size={13} />
          </Link>
        </div>

        {/* Right — mock */}
        <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200 p-5">
          {/* Score cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Direct Score", value: "82", sub: "/ 100", icon: Target, trend: "+12 pts" },
              { label: "Prompts Won", value: "10/12", sub: "83%", icon: Trophy, trend: "+3" },
              { label: "Citation Rate", value: "64%", sub: "avg: 48%", icon: Quote, trend: "+18%" },
            ].map(({ label, value, sub, icon: Icon, trend }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</span>
                  <Icon size={12} className="text-[#94A3B8]" />
                </div>
                <div className="flex items-baseline gap-1 mb-0.5">
                  <p className="text-[20px] font-black text-[#0F172A] leading-none">{value}</p>
                  <p className="text-[11px] text-[#94A3B8]">{sub}</p>
                </div>
                <span className="text-[11px] font-bold text-[#16A34A]">↑ {trend}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-[#0F172A]">Direct Score trend</p>
              <span className="text-[11px] text-[#94A3B8]">Last 10 scans</span>
            </div>
            <MiniChart h={80} />
          </div>

          {/* Platform breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[13px] font-bold text-[#0F172A] mb-3">Platform breakdown</p>
            <div className="flex flex-col gap-2.5">
              {providerData.map(({ name, score, mentions, total, color }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold text-[#0F172A] w-20 shrink-0">{name}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${score}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#0F172A] w-12 text-right shrink-0 tabular-nums">
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

// ─── 3. COMPETITOR INTELLIGENCE ───────────────────────────────────────────

function CompetitorSection() {
  const competitors = [
    { name: "Your business", score: 41, color: "#2563EB", isYou: true },
    { name: "Competitor A", score: 58, color: "#94A3B8", isYou: false },
    { name: "Competitor B", score: 52, color: "#94A3B8", isYou: false },
    { name: "Competitor C", score: 34, color: "#94A3B8", isYou: false },
  ];

  const promptWins = [
    { prompt: "Best mountain bike shop near me", you: true, them: false },
    { prompt: "Top-rated bike repair service", you: false, them: true },
    { prompt: "Full suspension bike under $4,000", you: true, them: true },
    { prompt: "Kids bike fitting specialists", you: false, them: true },
    { prompt: "Bike rental for weekend trails", you: true, them: false },
  ];

  return (
    <Section id="competitors" bg="bg-[#F8FAFC]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left mock */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          {/* Head-to-head */}
          <p className="text-[13px] font-bold text-[#0F172A] mb-4">AI visibility — head-to-head</p>
          <div className="flex flex-col gap-2.5 mb-5">
            {competitors.map(({ name, score, color, isYou }) => (
              <div key={name} className="flex items-center gap-3">
                <span
                  className={`text-[12px] font-semibold w-28 shrink-0 truncate ${
                    isYou ? "text-[#2563EB]" : "text-[#64748B]"
                  }`}
                >
                  {name}
                </span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${score}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-[12px] font-bold text-[#0F172A] w-7 text-right shrink-0 tabular-nums">
                  {score}%
                </span>
              </div>
            ))}
          </div>

          {/* Prompt win/loss grid */}
          <p className="text-[11px] font-bold text-[#0F172A] mb-2.5 uppercase tracking-wider">Prompt win/loss breakdown</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left font-semibold text-[#94A3B8] pb-2 pr-4">Prompt</th>
                  <th className="text-center font-semibold text-[#2563EB] pb-2 px-3">You</th>
                  <th className="text-center font-semibold text-[#94A3B8] pb-2 px-3">Comp A</th>
                </tr>
              </thead>
              <tbody>
                {promptWins.map(({ prompt, you, them }) => (
                  <tr key={prompt} className="border-b border-slate-50">
                    <td className="py-2 pr-4 text-[#475569] max-w-[180px] truncate">{prompt}</td>
                    <td className="py-2 px-3 text-center">
                      {you ? (
                        <CheckCircle2 size={13} className="text-[#16A34A] mx-auto" />
                      ) : (
                        <XCircle size={13} className="text-[#94A3B8] mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {them ? (
                        <CheckCircle2 size={13} className="text-[#DC2626] mx-auto" />
                      ) : (
                        <XCircle size={13} className="text-[#94A3B8] mx-auto" />
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
            See every competitor AI favors across your tracked prompts. Understand which categories
            they dominate, where you win, and what changes would flip the result.
          </Body>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "Tracked competitor list with per-prompt breakdown",
              "Head-to-head AI visibility percentage comparison",
              "Prompt-level win/loss vs. every competitor",
              "Changes between scans — see when gaps close or widen",
              "One-click: turn competitor gaps into Opportunities",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#475569]">
                <CheckCircle2 size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
          >
            See your competitor analysis <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </Section>
  );
}

// ─── 4. CITATIONS ──────────────────────────────────────────────────────────

function CitationsSection() {
  const citations = [
    { domain: "yelp.com", count: 12, type: "Review site", isYours: false },
    { domain: "yourbusiness.com", count: 9, type: "Your domain", isYours: true },
    { domain: "tripadvisor.com", count: 7, type: "Review site", isYours: false },
    { domain: "competitor-a.com", count: 14, type: "Competitor", isYours: false },
    { domain: "local.google.com", count: 6, type: "Directory", isYours: false },
  ];

  return (
    <Section id="citations" bg="bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left copy */}
        <div>
          <Eyebrow>Citations & Sources</Eyebrow>
          <H2 className="mb-4">See what sources AI trusts when answering about your industry.</H2>
          <Body className="mb-6 max-w-[460px]">
            AI systems cite specific websites when constructing answers. Customers.Direct reveals
            which domains are cited most often, whether your own site appears, and where
            competitors have citation advantages.
          </Body>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "Full citation source list with appearance counts",
              "Your domain vs. competitor domain citation comparison",
              "Gap analysis — sources citing competitors but not you",
              "Source type classification (review, directory, editorial)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#475569]">
                <CheckCircle2 size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right mock */}
        <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200 p-5">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[13px] font-bold text-[#0F172A]">Top cited sources</p>
              <span className="text-[11px] text-[#94A3B8]">Latest scan</span>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left font-semibold text-[#94A3B8] uppercase tracking-wider text-[10px] px-4 py-2.5">Domain</th>
                  <th className="text-left font-semibold text-[#94A3B8] uppercase tracking-wider text-[10px] px-4 py-2.5">Type</th>
                  <th className="text-right font-semibold text-[#94A3B8] uppercase tracking-wider text-[10px] px-4 py-2.5">Cites</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {citations.map(({ domain, count, type, isYours }) => (
                  <tr key={domain} className={isYours ? "bg-[#EFF6FF]/50" : "hover:bg-slate-50"}>
                    <td className="px-4 py-2.5">
                      <span className={`font-semibold ${isYours ? "text-[#2563EB]" : "text-[#0F172A]"}`}>
                        {domain}
                      </span>
                      {isYours && (
                        <span className="ml-2 text-[9px] bg-[#DBEAFE] text-[#2563EB] px-1.5 py-0.5 rounded font-bold">YOU</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[#64748B]">{type}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-[#0F172A]">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-[#FEF2F2] rounded-xl border border-[#FECACA] p-4">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={14} className="text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold text-[#DC2626] mb-0.5">Citation gap detected</p>
                <p className="text-[11px] text-[#B91C1C]">
                  competitor-a.com is cited 14× while yourbusiness.com appears only 9×. Improving
                  your Yelp and directory presence could close this gap.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── 5. OPPORTUNITIES ─────────────────────────────────────────────────────

const SAMPLE_OPPORTUNITIES = [
  {
    impact: "HIGH",
    title: "Missing buyer-intent prompts in ChatGPT",
    evidence: "Your business is not mentioned in 4 of 10 high-volume buyer prompts on ChatGPT.",
    action: "Create dedicated service/product pages matching query intent.",
    color: "text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]",
  },
  {
    impact: "MED",
    title: "Weak structured data for local entity",
    evidence: "Schema markup is incomplete. AI has low confidence in your location and services.",
    action: "Add LocalBusiness schema with full address, hours, and service descriptions.",
    color: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]",
  },
  {
    impact: "LOW",
    title: "Citation gap on Yelp and Google Business",
    evidence: "Top competitor is cited by Yelp and Google Business Profile 6× more often.",
    action: "Improve Yelp profile completeness and verify Google Business Profile.",
    color: "text-[#0369A1] bg-[#EFF6FF] border-[#BFDBFE]",
  },
];

function OpportunitiesSection() {
  return (
    <Section id="opportunities" bg="bg-[#F8FAFC]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
        {/* Left copy */}
        <div className="lg:sticky lg:top-24">
          <Eyebrow>Opportunities</Eyebrow>
          <H2 className="mb-4">Know exactly what to fix next.</H2>
          <Body className="mb-6 max-w-[460px]">
            Every opportunity is generated from real scan evidence — not generic advice. Each one
            includes the specific issue, why it matters, and a recommended action. Where the fix
            involves content or code, you get a ready-made prompt to send to Claude.
          </Body>

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-3">
              The Customers.Direct loop
            </p>
            {[
              { step: "01", label: "Detect", desc: "AI scans identify gaps and missed prompts" },
              { step: "02", label: "Explain", desc: "Evidence-backed opportunity cards surface" },
              { step: "03", label: "Fix", desc: "Recommended action + Claude prompt provided" },
              { step: "04", label: "Rescan", desc: "Run a new scan after implementing the fix" },
              { step: "05", label: "Measure", desc: "Direct Score reflects the improvement" },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <span className="text-[10px] font-black text-[#2563EB] bg-[#EFF6FF] rounded-md w-7 h-7 flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </span>
                <div>
                  <p className="text-[13px] font-bold text-[#0F172A]">{label}</p>
                  <p className="text-[11px] text-[#64748B]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — opportunity cards */}
        <div className="flex flex-col gap-4">
          {SAMPLE_OPPORTUNITIES.map(({ impact, title, evidence, action, color }) => (
            <div key={title} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 mt-0.5 ${color}`}>
                  {impact} impact
                </span>
                <h3 className="text-[14px] font-bold text-[#0F172A] leading-snug">{title}</h3>
              </div>
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">Evidence</p>
                <p className="text-[12px] text-[#475569]">{evidence}</p>
              </div>
              <p className="text-[12px] text-[#0F172A] mb-3">
                <span className="font-bold">Recommended: </span>{action}
              </p>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#7C3AED] bg-[#F5F3FF] border border-[#EDE9FE] px-3 py-1.5 rounded-lg hover:bg-[#EDE9FE] transition-colors">
                  <Copy size={11} />
                  Copy for Claude
                </button>
                <button className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-[#1d4ed8] transition-colors">
                  <Zap size={11} />
                  Have us fix it
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── 6. DIRECT AGENT ──────────────────────────────────────────────────────

const AGENT_MESSAGES = [
  {
    role: "user",
    text: "Why did my Direct Score drop from 74 to 68 this week?",
  },
  {
    role: "agent",
    text: `EVIDENCE: Your scan from May 14 shows that Perplexity stopped mentioning your business on 2 prompts where it previously included you. Specifically: "best bike shop in Austin" and "Trek dealer near downtown Austin."

EVIDENCE: A new competitor (specialized-austin.com) was detected appearing on those same prompts starting May 13.

INFERENCE: This drop is likely driven by Perplexity increasing citations of a competitor who recently updated their location entity data. Fixing your Google Business Profile structured data for the downtown Austin location is the highest-priority recommended action.`,
  },
];

function DirectAgentSection() {
  return (
    <Section id="direct-agent" bg="bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left copy */}
        <div>
          <Eyebrow>Direct Agent</Eyebrow>
          <H2 className="mb-4">Ask anything. Get answers grounded in your data.</H2>
          <Body className="mb-6 max-w-[460px]">
            The Direct Agent is your AI assistant — but one that only speaks from evidence. It
            reads your actual scan data and clearly separates what is factual from what it is
            inferring. No hallucinations about your business.
          </Body>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "Answers grounded in your real visibility scan data",
              "Clearly labels EVIDENCE vs. INFERENCE",
              "Identifies root causes behind Direct Score changes",
              "Recommends specific fixes based on your actual gaps",
              "Suggests which prompts to prioritize next scan",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-[#475569]">
                <CheckCircle2 size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-3">
              Example questions to ask
            </p>
            {[
              "Why is my Direct Score this low?",
              "Which competitor is beating me most often?",
              "What should I fix first this week?",
              "Why does ChatGPT recommend them instead of us?",
            ].map((q) => (
              <div
                key={q}
                className="flex items-center gap-2 py-2 border-b border-slate-200 last:border-0 text-[13px] text-[#475569]"
              >
                <ChevronRight size={12} className="text-[#2563EB] shrink-0" />
                {q}
              </div>
            ))}
          </div>
        </div>

        {/* Right — chat mock */}
        <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200 overflow-hidden">
          {/* Chat header */}
          <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0">
              <Bot size={13} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#0F172A]">Direct Agent</p>
              <p className="text-[10px] text-[#94A3B8]">Grounded in your visibility data</p>
            </div>
          </div>

          {/* Messages */}
          <div className="p-5 flex flex-col gap-4">
            {AGENT_MESSAGES.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    m.role === "user" ? "bg-[#0F172A]" : "bg-gradient-to-br from-[#2563EB] to-[#7C3AED]"
                  }`}
                >
                  {m.role === "user" ? (
                    <span className="text-[9px] font-black text-white">YOU</span>
                  ) : (
                    <Bot size={11} className="text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#0F172A] text-white rounded-tr-sm"
                      : "bg-white border border-slate-200 text-[#0F172A] rounded-tl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-4 flex gap-2">
            <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[12px] text-[#94A3B8]">
              Ask about your AI visibility…
            </div>
            <button className="bg-[#2563EB] text-white w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#1d4ed8] transition-colors">
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── 7. AGENCY / RESELLER ──────────────────────────────────────────────────

function AgencySection() {
  return (
    <Section id="agencies" bg="bg-[#0F172A]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        {/* Left */}
        <div>
          <span className="inline-block text-[11px] font-black uppercase tracking-[0.15em] text-[#3B82F6] mb-3">
            Agencies & Resellers
          </span>
          <H2 className="text-white mb-4">
            Manage every client&apos;s AI visibility from one login.
          </H2>
          <p className="text-[16px] text-slate-400 leading-relaxed mb-6 max-w-[460px]">
            Customers.Direct is built for agencies from the ground up. One login. Multiple client
            workspaces. You own the billing relationship — your clients never see a Customers.Direct invoice.
          </p>
          <ul className="flex flex-col gap-3 mb-8">
            {[
              "One login → unlimited client businesses",
              "Per-business subscriptions billed to you, not your client",
              "Business switcher for seamless client switching",
              "White-label reports — your brand, your client name",
              "Reseller economics — contact us for wholesale pricing",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-400">
                <CheckCircle2 size={15} className="text-[#3B82F6] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-5 py-2.5 rounded-lg hover:bg-[#1d4ed8] transition-colors text-[14px] active:scale-[0.97]"
            >
              Start free — add clients later <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Right — business switcher mock */}
        <div className="bg-white/8 rounded-2xl border border-white/10 p-5">
          <div className="bg-[#0F172A] rounded-xl border border-white/10 overflow-hidden">
            {/* Sidebar strip */}
            <div className="flex">
              <div className="w-[120px] border-r border-white/10 bg-white/5 py-4 px-3 flex flex-col gap-1">
                <p className="text-[8px] font-bold uppercase tracking-wider text-white/30 mb-2">Your businesses</p>
                {[
                  { name: "Bike Shop A", active: true },
                  { name: "Café Brand B", active: false },
                  { name: "Law Firm C", active: false },
                  { name: "Spa & Wellness D", active: false },
                ].map(({ name, active }) => (
                  <div
                    key={name}
                    className={`px-2.5 py-2 rounded-lg text-[10px] font-medium truncate ${
                      active ? "bg-[#2563EB] text-white" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {name}
                  </div>
                ))}
                <button className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-[#3B82F6]">
                  <span className="text-base leading-none">+</span>
                  Add client
                </button>
              </div>

              {/* Main content */}
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded bg-orange-500 flex items-center justify-center text-white text-[9px] font-black">B</div>
                  <p className="text-[12px] font-bold text-white">Bike Shop A</p>
                  <span className="ml-auto text-[9px] text-white/30 bg-white/10 px-2 py-0.5 rounded">Direct Score: 82</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Prompts Won", value: "10/12" },
                    { label: "Competitors", value: "5 tracked" },
                    { label: "Open Opps", value: "3" },
                    { label: "Last scan", value: "2 hrs ago" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/8 rounded-lg p-2.5">
                      <p className="text-[9px] text-white/40 mb-0.5">{label}</p>
                      <p className="text-[13px] font-bold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2.5 bg-white/8 rounded-xl border border-white/10 px-4 py-3">
            <Building2 size={14} className="text-[#3B82F6] shrink-0" />
            <p className="text-[12px] text-white/60">
              <span className="font-bold text-white">Agency billing:</span> You pay Customers.Direct monthly. Your clients never see our invoices.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── 8. FINAL CTA ─────────────────────────────────────────────────────────

function FinalCTASection() {
  return (
    <section className="bg-[#F1F5F9] py-20 px-4 border-t border-slate-200 overflow-hidden">
      <div className="max-w-6xl mx-auto text-center">
        <Eyebrow>Get started</Eyebrow>
        <H2 className="mb-4">
          Start measuring your AI visibility today.
        </H2>
        <Body className="mb-8 max-w-xl mx-auto">
          Free visibility score. No credit card required. See exactly where ChatGPT, Claude,
          Perplexity, and Gemini recommend your business — or recommend your competitors instead.
        </Body>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-3 rounded-lg hover:bg-[#1d4ed8] transition-all duration-150 active:scale-[0.97] text-[15px]"
          >
            Check My AI Visibility — Free
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/ai-search#pricing"
            className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] font-semibold text-[14px] transition-colors"
          >
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────

export default function HomepagePlatform() {
  return (
    <>
      <HeroSection />
      <AIVisibilitySection />
      <CompetitorSection />
      <CitationsSection />
      <OpportunitiesSection />
      <DirectAgentSection />
      <AgencySection />
      <FinalCTASection />
    </>
  );
}
