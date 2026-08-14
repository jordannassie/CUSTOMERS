"use client";

import { useState } from "react";
import { Monitor, Copy, ExternalLink, FileText, Mail, Phone, AlertCircle, Users, Building, X, Check } from "lucide-react";

const INDUSTRIES = ["Med Spa", "Dental", "Law Firm", "Roofing", "HVAC", "Plumbing", "Real Estate", "Salon", "Home Services"];

const TOOL_CARDS = [
  { id: "cold-call", icon: Phone, title: "Cold Call Script", desc: "A conversation guide for your first call." },
  { id: "cold-email", icon: Mail, title: "Cold Email", desc: "An email template for outreach." },
  { id: "followup", icon: FileText, title: "Follow-Up Script", desc: "What to say after a demo or meeting." },
  { id: "objections", icon: AlertCircle, title: "Objection Guide", desc: "Responses to common sales objections." },
  { id: "one-pager", icon: Users, title: "AI Employee One-Pager", desc: "A leave-behind for prospects." },
  { id: "examples", icon: Building, title: "Industry Examples", desc: "Sample use cases by industry." },
];

const TOOL_CONTENT: Record<string, { title: string; body: string }> = {
  "cold-call": {
    title: "Cold Call Script",
    body: `Hi, this is [Your Name] — I work with Customers Direct. I'm reaching out to [Business Name] because I noticed you're a [industry] business, and I wanted to ask you a quick question.\n\nIf a customer calls your business and no one is available to answer, what typically happens?\n\n[Let them answer]\n\nThat's pretty common. We help businesses like yours make sure every call gets answered — with an AI Employee that qualifies callers, sends booking links, and sends you a summary after the call.\n\nWould you be open to a quick 15-minute demo? I can show you exactly what it would sound like for your business.`,
  },
  "cold-email": {
    title: "Cold Email Template",
    body: `Subject: What happens when a customer calls and no one answers?\n\nHi [First Name],\n\nIf a customer calls [Business Name] after hours or while your team is busy, what happens?\n\nFor most service businesses, that customer ends up calling someone else.\n\nCustomers Direct helps businesses like yours make sure every call gets answered — with an AI Employee that handles the conversation, qualifies the caller, and sends you the details.\n\nWould you be open to seeing a quick demo built around your business?\n\n[Your Name]`,
  },
  "followup": {
    title: "Follow-Up Script",
    body: `Hi [Name], this is [Your Name] following up after our conversation about Customers Direct.\n\nI wanted to check in and see if you had any questions after seeing the demo.\n\nA lot of business owners I talk to are surprised by how quickly the setup happens and how natural the conversations sound.\n\nDo you have any questions, or is there anything else I can show you to help you decide if it's a good fit?`,
  },
  "objections": {
    title: "Objection Guide",
    body: `"We already have voicemail."\n→ Voicemail is passive — callers may hang up instead of leaving a message. AI Employee actively engages the caller.\n\n"Our customers prefer to talk to a real person."\n→ They do — but if no one is available, they'll call the next business. The AI ensures they always reach someone immediately.\n\n"We're not ready for AI."\n→ The setup is handled entirely by Customers Direct. Your team doesn't need to manage or configure anything.\n\n"We're too busy right now."\n→ That's actually why this makes sense — the busier you are, the more calls you're likely missing.`,
  },
  "one-pager": {
    title: "AI Employee One-Pager",
    body: `CUSTOMERS DIRECT — AI EMPLOYEE\n\nNever miss another customer call.\n\nYour AI Employee answers 24/7, qualifies callers, books appointments, and sends you the lead — automatically.\n\nWHAT IT DOES:\n• Answers every call, even after hours\n• Asks qualifying questions\n• Sends booking links during the call\n• Delivers a lead summary to your team\n• Works in 50+ languages\n• Keeps your existing business number\n\nSIMPLE PRICING: $997/month\nOne AI Employee. One monthly price.\n\nCustomers.Direct`,
  },
  "examples": {
    title: "Industry Examples",
    body: `MED SPA:\nThe AI answers consultation inquiries, explains available services, qualifies the caller, and sends a booking link.\n\nDENTAL:\nNew patients can call after hours, describe their issue, and receive a booking link for the next available appointment.\n\nROOFING:\nDuring storm season, when crews are busy, every call gets answered and the lead details are sent to the office.\n\nHVAC:\nUrgent calls are triaged immediately. The AI gathers the problem, location, and preferred time, then sends the lead.\n\nLAW FIRMS:\nNew client inquiries are captured and qualified with the AI asking about the matter type and urgency before routing.`,
  },
};

interface DemoState {
  business: string;
  website: string;
  industry: string;
  ready: boolean;
  copied: boolean;
}

export default function SalesTools() {
  const [demoForm, setDemoForm] = useState<DemoState>({ business: "", website: "", industry: "", ready: false, copied: false });
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const demoSlug = demoForm.business.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const demoLink = `customers.direct/demo/${demoSlug}`;

  function handlePrepare(e: React.FormEvent) {
    e.preventDefault();
    if (!demoForm.business) return;
    setDemoForm((p) => ({ ...p, ready: true }));
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#0F172A]">Sales Tools</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Everything you need to show a business what Customers Direct can do.
        </p>
      </div>

      {/* Demo creator */}
      <div
        className="bg-white rounded-2xl border border-gray-100 p-6"
        style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center">
            <Monitor size={18} className="text-[#2563EB]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-bold text-[#0F172A]">Create a Demo</h2>
            <p className="text-xs text-[#64748B]">Prepare a custom demo for a prospect</p>
          </div>
        </div>

        {!demoForm.ready ? (
          <form onSubmit={handlePrepare} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Business Name</label>
              <input
                type="text"
                value={demoForm.business}
                onChange={(e) => setDemoForm((p) => ({ ...p, business: e.target.value }))}
                placeholder="Dallas Med Spa"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Website</label>
              <input
                type="text"
                value={demoForm.website}
                onChange={(e) => setDemoForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#0F172A] placeholder-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Industry</label>
              <select
                value={demoForm.industry}
                onChange={(e) => setDemoForm((p) => ({ ...p, industry: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-bold px-6 py-2.5 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm"
              >
                <Monitor size={14} aria-hidden="true" />
                Prepare Demo
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Check size={16} className="text-[#22C55E]" aria-hidden="true" />
              <span className="font-bold text-[#0F172A]">Demo Ready</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-[#64748B] mb-0.5">Business</p>
                <p className="font-semibold text-[#0F172A] text-sm">{demoForm.business}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B] mb-0.5">Demo Link</p>
                <p className="font-mono text-sm text-[#2563EB] break-all">{demoLink}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(demoLink).catch(() => {});
                  setDemoForm((p) => ({ ...p, copied: true }));
                  setTimeout(() => setDemoForm((p) => ({ ...p, copied: false })), 2000);
                }}
                className="inline-flex items-center gap-2 bg-white border border-[#DBEAFE] text-[#2563EB] font-semibold px-5 py-2 rounded-full hover:bg-white/80 transition-colors text-sm"
              >
                <Copy size={13} aria-hidden="true" />
                {demoForm.copied ? "Copied!" : "Copy Demo Link"}
              </button>
              <button className="inline-flex items-center gap-2 bg-[#2563EB] text-white font-semibold px-5 py-2 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm">
                <ExternalLink size={13} aria-hidden="true" />
                Open Demo
              </button>
              <button
                onClick={() => setDemoForm({ business: "", website: "", industry: "", ready: false, copied: false })}
                className="text-xs text-[#94A3B8] hover:text-[#64748B] transition-colors"
              >
                Start over
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tool cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOL_CARDS.map(({ id, icon: Icon, title, desc }) => (
          <button
            key={id}
            onClick={() => setActiveTool(id)}
            className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:border-[#DBEAFE] hover:shadow-md transition-all group focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center mb-3 group-hover:bg-[#DBEAFE] transition-colors">
              <Icon size={17} className="text-[#2563EB]" aria-hidden="true" />
            </div>
            <p className="font-bold text-[#0F172A] text-sm mb-1">{title}</p>
            <p className="text-xs text-[#64748B]">{desc}</p>
          </button>
        ))}
      </div>

      {/* Tool modal */}
      {activeTool && TOOL_CONTENT[activeTool] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={TOOL_CONTENT[activeTool].title}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveTool(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#0F172A] text-lg">{TOOL_CONTENT[activeTool].title}</h2>
              <button
                onClick={() => setActiveTool(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <pre className="text-sm text-[#334155] leading-relaxed font-sans whitespace-pre-wrap">{TOOL_CONTENT[activeTool].body}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
