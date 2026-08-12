import { Check, ArrowRight, FileText } from "lucide-react";

function SMSCard() {
  return (
    <div className="w-full max-w-[280px] mx-auto">
      {/* Phone shell */}
      <div
        className="bg-[#0F172A] rounded-[32px] p-3"
        style={{ boxShadow: "0 32px 64px rgba(15,23,42,0.4)" }}
      >
        <div className="bg-[#1E293B] rounded-[24px] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-2">
            <span className="text-[10px] font-semibold text-white/60">9:41</span>
            <div className="flex items-center gap-1" aria-hidden="true">
              <div className="w-4 h-2 rounded-sm border border-white/40 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-3/4 bg-white/40 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Messages header */}
          <div className="bg-[#1E293B] px-5 py-3 border-b border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Messages
            </p>
          </div>

          {/* SMS thread */}
          <div className="bg-white px-4 py-5 flex flex-col gap-3 min-h-[280px]">
            {/* Sender label */}
            <div className="text-center">
              <span className="text-[10px] text-[#94A3B8] font-semibold">
                CUSTOMERS DIRECT
              </span>
            </div>

            {/* SMS bubble */}
            <div
              className="bg-[#E8F5E9] rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-[#0F172A] leading-relaxed"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <p className="font-bold text-[#0F172A] mb-2 text-sm">
                New lead — Sarah Mitchell
              </p>
              <p className="text-[#334155] mb-1">(214) 555-0148</p>
              <hr className="border-[#D1FAE5] my-2" />
              <p className="text-[#334155]">Interested in Botox consultation.</p>
              <p className="text-[#334155]">Prefers Thursday afternoon.</p>
              <p className="text-[#64748B] mt-1 text-[11px]">Urgency: Normal</p>
              <div className="mt-3 flex items-center gap-1.5 text-[#15803D] font-semibold text-[11px]">
                <Check size={11} aria-hidden="true" />
                Booking link sent
              </div>
              <button className="mt-3 inline-flex items-center gap-1 text-[#2563EB] text-[11px] font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-[#2563EB] rounded">
                View Call Details
                <ArrowRight size={10} aria-hidden="true" />
              </button>
            </div>

            {/* Delivery tick */}
            <div className="flex justify-start pl-1">
              <span className="text-[10px] text-[#94A3B8]">Delivered</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AICallSummarySection() {
  return (
    <section className="gradient-bg py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* LEFT — Copy */}
        <div>
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            After Every Call
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight mb-6">
            Know exactly who called and what they need.
          </h2>
          <p className="text-lg text-[#64748B] leading-relaxed mb-8 max-w-md">
            Your team receives a clear lead summary so you know who to follow up
            with, what they wanted, and what happened during the conversation.
          </p>

          <div className="flex flex-col gap-4">
            {[
              "Caller name and contact information",
              "What they were looking for",
              "Urgency and next steps",
              "What the AI said and did during the call",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center shrink-0">
                  <Check size={12} className="text-[#2563EB]" aria-hidden="true" />
                </div>
                <span className="text-sm font-medium text-[#64748B]">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 inline-flex items-center gap-2 bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl px-4 py-3">
            <FileText size={16} className="text-[#2563EB]" aria-hidden="true" />
            <span className="text-sm font-semibold text-[#2563EB]">
              Lead summary sent after every call
            </span>
          </div>
        </div>

        {/* RIGHT — SMS Card */}
        <div className="flex justify-center lg:justify-end">
          <SMSCard />
        </div>
      </div>
    </section>
  );
}
