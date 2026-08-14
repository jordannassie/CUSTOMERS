import { PhoneCall, VoicemailIcon, Search, CheckCircle } from "lucide-react";

const TIMELINE = [
  {
    time: "0:00",
    icon: <PhoneCall size={18} className="text-[#2563EB]" aria-hidden="true" />,
    color: "bg-[#EFF6FF] border-[#DBEAFE]",
    label: "CUSTOMER CALLS",
    desc: "They need your service now.",
  },
  {
    time: "0:22",
    icon: <VoicemailIcon size={18} className="text-[#94A3B8]" aria-hidden="true" />,
    color: "bg-gray-50 border-gray-200",
    label: "VOICEMAIL",
    desc: "No one is available.",
  },
  {
    time: "1:00",
    icon: <Search size={18} className="text-[#94A3B8]" aria-hidden="true" />,
    color: "bg-gray-50 border-gray-200",
    label: "GOOGLE",
    desc: "They search for another business.",
  },
  {
    time: "3:00",
    icon: <PhoneCall size={18} className="text-[#94A3B8]" aria-hidden="true" />,
    color: "bg-gray-50 border-gray-200",
    label: "COMPETITOR ANSWERS",
    desc: "The opportunity moves on.",
  },
];

export default function AIProblemSection() {
  return (
    <section className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            The Problem
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight max-w-2xl mx-auto mb-4">
            Your next customer may already be calling.
          </h2>
          <p className="text-lg text-[#64748B] max-w-xl mx-auto leading-relaxed">
            When a customer needs help, they usually call more than one business.
            The company that answers first often gets the opportunity.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative max-w-2xl mx-auto mb-14">
          {/* Vertical connector line */}
          <div
            className="absolute left-10 top-10 bottom-10 w-px bg-gradient-to-b from-[#DBEAFE] via-gray-200 to-gray-200 hidden sm:block"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-4">
            {TIMELINE.map((step, i) => (
              <div key={i} className="flex items-start gap-4 sm:gap-6 relative">
                {/* Time badge */}
                <div className="w-20 shrink-0 flex flex-col items-center pt-1">
                  <span className="text-xs font-black text-[#64748B] font-mono">{step.time}</span>
                </div>

                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 relative z-10 ${step.color}`}
                >
                  {step.icon}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-0.5">
                    {step.label}
                  </p>
                  <p className="text-sm text-[#64748B]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customers Direct answer card */}
        <div
          className="max-w-2xl mx-auto rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#F5F3FF] border border-[#DBEAFE] p-8"
          style={{ boxShadow: "0 4px 24px rgba(37,99,235,0.1)" }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
              <PhoneCall size={22} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className="text-[#22C55E]" aria-hidden="true" />
                <span className="text-xs font-black uppercase tracking-widest text-[#2563EB]">
                  Customers Direct Answers Instead
                </span>
              </div>
              <p className="text-xl font-black text-[#0F172A] mb-2">
                Your AI Employee is always ready.
              </p>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Your AI Employee can answer when you are busy, after hours, on
                another call, or away from the office — so every caller gets a
                response immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
