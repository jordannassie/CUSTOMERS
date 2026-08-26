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

const COMPETITOR_DATA = [
  { name: "Your Business", score: 47, isYou: true },
  { name: "Monday.com", score: 65, isYou: false },
  { name: "Competitor B", score: 62, isYou: false },
  { name: "Competitor C", score: 34, isYou: false },
];

function HeroDashboardPreview() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E1] overflow-hidden w-full" style={{ boxShadow: "0 4px 40px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex" style={{ height: 380 }}>
        {/* Sidebar */}
        <div className="w-[130px] shrink-0 bg-white border-r border-[#EEEEEA] flex flex-col py-3">
          <div className="px-3 mb-4">
            <span className="text-[10px] font-bold text-[#171717] leading-none">
              Customers<span className="text-[#3B82F6]">.Direct</span>
            </span>
          </div>
          <div className="px-2 mb-3">
            <p className="text-[7px] font-semibold uppercase tracking-wider text-[#A3A3A0] mb-1.5 px-1">Business</p>
            <div className="flex items-center gap-1.5 bg-[#F5F5F2] border border-[#E5E5E1] rounded-md px-2 py-1.5">
              <div className="w-3 h-3 rounded bg-amber-500 shrink-0" />
              <span className="text-[9px] font-semibold text-[#171717] truncate">Bike Shop</span>
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
                  active
                    ? "bg-[#F0F0EC] text-[#171717]"
                    : "text-[#A3A3A0]"
                }`}
              >
                <Icon size={9} aria-hidden="true" />
                {label}
              </div>
            ))}
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 bg-[#FAFAF8] p-3.5 flex flex-col gap-2.5 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#171717]">Dashboard</p>
              <p className="text-[8px] text-[#A3A3A0]">AI search visibility overview</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] text-[#777773] bg-white border border-[#E5E5E1] px-2 py-1 rounded-md">Last 7 days</span>
              <button className="flex items-center gap-1 bg-[#171717] text-white text-[8px] font-semibold px-2.5 py-1.5 rounded-md">
                <RefreshCw size={7} aria-hidden="true" />
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
              <div key={label} className="bg-white rounded-lg border border-[#E5E5E1] p-2.5">
                <p className="text-[7px] font-semibold text-[#A3A3A0] uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-[15px] font-bold text-[#171717] leading-none">{value}</p>
                  <p className="text-[8px] text-[#A3A3A0]">{sub}</p>
                </div>
                <span className={`text-[8px] font-semibold ${up ? "text-[#166534]" : "text-[#991B1B]"}`}>
                  {up ? "↑" : "↓"} {trend}
                </span>
              </div>
            ))}
          </div>

          {/* Chart + Competitors */}
          <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
            <div className="bg-white rounded-lg border border-[#E5E5E1] p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-semibold text-[#171717]">Visibility trend</p>
                <span className="text-[7px] text-[#A3A3A0]">10 scans</span>
              </div>
              <MiniChart h={72} />
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E1] p-2.5">
              <p className="text-[9px] font-semibold text-[#171717] mb-2">Competitor ranking</p>
              <div className="flex flex-col gap-1.5">
                {COMPETITOR_DATA.map(({ name, score, isYou }) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <span className={`text-[8px] truncate w-[60px] shrink-0 ${isYou ? "font-bold text-[#171717]" : "text-[#777773]"}`}>{name}</span>
                    <div className="flex-1 h-1.5 bg-[#F0F0EC] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${score}%`, backgroundColor: isYou ? "#171717" : "#D4D4CF" }}
                      />
                    </div>
                    <span className={`text-[8px] font-semibold w-5 text-right tabular-nums ${isYou ? "text-[#171717]" : "text-[#A3A3A0]"}`}>{score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Platform bar */}
          <div className="bg-white rounded-lg border border-[#E5E5E1] p-2.5">
            <p className="text-[8px] font-semibold text-[#171717] mb-1.5">Platform visibility breakdown</p>
            <div className="flex gap-2">
              {[
                { name: "ChatGPT", val: 82, color: "#10B981" },
                { name: "Claude", val: 74, color: "#8B5CF6" },
                { name: "Perplexity", val: 68, color: "#3B82F6" },
                { name: "Gemini", val: 51, color: "#EF4444" },
              ].map(({ name, val, color }) => (
                <div key={name} className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[7px] text-[#777773]">{name}</span>
                    <span className="text-[7px] font-semibold" style={{ color }}>{val}</span>
                  </div>
                  <div className="h-1 bg-[#F0F0EC] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Soft bottom fade */}
      <div className="h-8 bg-gradient-to-t from-white/60 to-transparent -mt-8 relative pointer-events-none" />
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
          {AI_PLATFORMS.map(({ name, color }) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#777773] bg-white border border-[#E5E5E1] px-3 py-1.5 rounded-full"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
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

const PLATFORM_COLORS: Record<string, string> = {
  ChatGPT: "#10B981",
  Claude: "#8B5CF6",
  Perplexity: "#3B82F6",
  Gemini: "#EF4444",
  "Google AI": "#EAB308",
};

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
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: PLATFORM_COLORS[platform] }}
              />
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
                  <span className="text-[12px] font-medium text-[#171717] w-20 shrink-0">{name}</span>
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

        {/* Right — business switcher mock */}
        <div className="bg-white/6 rounded-2xl border border-white/10 p-5">
          <div className="bg-[#222222] rounded-xl border border-white/10 overflow-hidden">
            <div className="flex">
              {/* Sidebar strip */}
              <div className="w-[130px] border-r border-white/10 py-4 px-3 flex flex-col gap-1">
                <p className="text-[8px] font-semibold uppercase tracking-wider text-white/30 mb-2">Your clients</p>
                {[
                  { name: "Bike Shop A", active: true },
                  { name: "Café Brand B", active: false },
                  { name: "Law Firm C", active: false },
                  { name: "Spa & Wellness D", active: false },
                ].map(({ name, active }) => (
                  <div
                    key={name}
                    className={`px-2.5 py-2 rounded-lg text-[10px] font-medium truncate ${
                      active ? "bg-white/10 text-white" : "text-white/35"
                    }`}
                  >
                    {name}
                  </div>
                ))}
                <button className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-white/40 hover:text-white/60 transition-colors">
                  <span className="text-base leading-none" aria-hidden="true">+</span>
                  Add client
                </button>
              </div>

              {/* Main content */}
              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0" aria-hidden="true">B</div>
                  <p className="text-[12px] font-semibold text-white">Bike Shop A</p>
                  <span className="ml-auto text-[9px] text-white/30 bg-white/8 px-2 py-0.5 rounded-md">Score: 82</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Prompts Won", value: "10/12" },
                    { label: "Competitors", value: "5 tracked" },
                    { label: "Open Opps", value: "3" },
                    { label: "Last scan", value: "2 hrs ago" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/6 rounded-lg p-2.5 border border-white/8">
                      <p className="text-[9px] text-white/30 mb-0.5">{label}</p>
                      <p className="text-[13px] font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2.5 bg-white/6 rounded-xl border border-white/10 px-4 py-3">
            <Building2 size={14} className="text-white/40 shrink-0" aria-hidden="true" />
            <p className="text-[12px] text-white/50">
              <span className="font-semibold text-white/70">Agency billing:</span> You pay Customers.Direct monthly. Your clients never see our invoices.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── 9. PRICING BRIDGE ────────────────────────────────────────────────────

function PricingBridgeSection() {
  return (
    <Section bg="bg-white" className="border-b border-[#EEEEEA]">
      <div className="text-center">
        <Eyebrow>Pricing</Eyebrow>
        <H2 className="mb-4">Simple, transparent pricing.</H2>
        <Body className="mb-8 max-w-xl mx-auto">
          Start free to see your AI visibility score. Upgrade for continuous monitoring, competitor tracking, opportunities, and the Direct Agent.
        </Body>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <PrimaryBtn href="/ai-search#pricing">
            View full pricing <ArrowRight size={14} aria-hidden="true" />
          </PrimaryBtn>
          <SecondaryBtn href="/signup">
            Start free
          </SecondaryBtn>
        </div>
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
          <SecondaryBtn href="/ai-search#pricing">
            View pricing
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

// ─── Main export ──────────────────────────────────────────────────────────

export default function HomepagePlatform() {
  return (
    <>
      <HeroSection />
      <PromptTrackingSection />
      <AIVisibilitySection />
      <KeySourcesSection />
      <CompetitorSection />
      <OpportunitiesSection />
      <DirectAgentSection />
      <AgencySection />
      <PricingBridgeSection />
      <FinalCTASection />
    </>
  );
}
