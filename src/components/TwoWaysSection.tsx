"use client";

import { ArrowDown, ArrowRight } from "lucide-react";

const CA_FLOW = ["AD", "DM", "CONVERSATION", "CUSTOMER"];
const AI_FLOW = ["CALL", "AI RECEPTIONIST", "QUALIFIED", "BOOKED"];

function FlowStep({
  label,
  last,
  color,
}: {
  label: string;
  last: boolean;
  color: "blue" | "violet";
}) {
  const bg = color === "blue" ? "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]" : "bg-[#F5F3FF] text-[#7C3AED] border-[#EDE9FE]";
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${bg}`}
      >
        {label}
      </div>
      {!last && (
        <ArrowDown size={14} className={color === "blue" ? "text-[#DBEAFE]" : "text-[#EDE9FE]"} aria-hidden="true" />
      )}
    </div>
  );
}

export default function TwoWaysSection() {
  return (
    <section className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow + Headline */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            Customers Direct
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-black text-[#0F172A] leading-tight mb-4">
            One system.{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
              }}
            >
              Two ways to grow.
            </span>
          </h2>
          <p className="text-lg text-[#64748B] max-w-xl mx-auto leading-relaxed">
            We help you create more customer opportunities — and make sure
            you&apos;re there when customers respond.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 — Customer Acquisition */}
          <div
            className="rounded-3xl border border-[#DBEAFE] bg-gradient-to-br from-[#EFF6FF] to-white p-8 flex flex-col"
            style={{ boxShadow: "0 4px 24px rgba(37,99,235,0.08)" }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-[#2563EB] mb-4">
              AI Customer Acquisition
            </span>
            <h3 className="text-2xl font-black text-[#0F172A] mb-6">
              Get More Customers.
            </h3>

            {/* Flow visual */}
            <div className="flex flex-col items-center gap-1 mb-8 py-4 bg-white rounded-2xl border border-[#DBEAFE]">
              {CA_FLOW.map((step, i) => (
                <FlowStep
                  key={step}
                  label={step}
                  last={i === CA_FLOW.length - 1}
                  color="blue"
                />
              ))}
            </div>

            <p className="text-sm text-[#64748B] leading-relaxed mb-8 flex-1">
              We run customer acquisition campaigns designed to start direct
              conversations with people interested in your business.
            </p>

            <button
              onClick={() => {
                const el = document.getElementById("how-it-works");
                if (el) {
                  const y = el.getBoundingClientRect().top + window.scrollY - 88;
                  window.scrollTo({ top: y, behavior: "smooth" });
                }
              }}
              className="inline-flex items-center justify-center gap-2 border border-[#DBEAFE] bg-white text-[#2563EB] font-bold px-6 py-3.5 rounded-full hover:bg-[#EFF6FF] transition-colors text-sm focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            >
              Explore AI Customer Acquisition
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          {/* Card 2 — AI Receptionist */}
          <div
            className="rounded-3xl border border-[#EDE9FE] bg-gradient-to-br from-[#F5F3FF] to-white p-8 flex flex-col"
            style={{ boxShadow: "0 4px 24px rgba(124,58,237,0.08)" }}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-[#7C3AED] mb-4">
              AI Receptionist
            </span>
            <h3 className="text-2xl font-black text-[#0F172A] mb-6">
              Never Miss One.
            </h3>

            {/* Flow visual */}
            <div className="flex flex-col items-center gap-1 mb-8 py-4 bg-white rounded-2xl border border-[#EDE9FE]">
              {AI_FLOW.map((step, i) => (
                <FlowStep
                  key={step}
                  label={step}
                  last={i === AI_FLOW.length - 1}
                  color="violet"
                />
              ))}
            </div>

            <p className="text-sm text-[#64748B] leading-relaxed mb-8 flex-1">
              Your AI Receptionist answers customer calls, qualifies
              opportunities and helps move callers toward the next step.
            </p>

            <a
              href="/ai-phone"
              className="inline-flex items-center justify-center gap-2 bg-[#7C3AED] text-white font-bold px-6 py-3.5 rounded-full hover:bg-[#6d28d9] transition-colors text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C3AED]"
            >
              Explore AI Phone
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
