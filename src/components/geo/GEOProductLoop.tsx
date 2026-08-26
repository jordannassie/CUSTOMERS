import { Radar, Stethoscope, ListChecks, Wrench, RefreshCw } from "lucide-react";

const STEPS = [
  {
    icon: Radar,
    title: "Measure",
    body:
      "We run real buyer-intent prompts against AI providers and record exactly how often — and how — your business is mentioned.",
  },
  {
    icon: Stethoscope,
    title: "Diagnose",
    body:
      "We compare what AI says about you versus your competitors, and surface the specific gaps holding your visibility back.",
  },
  {
    icon: ListChecks,
    title: "Recommend",
    body:
      "Every gap becomes a concrete opportunity — with the evidence behind it, not a generic checklist.",
  },
  {
    icon: Wrench,
    title: "Execute",
    body:
      "Send the fix to Claude yourself, or have Customers.Direct implement it for you.",
  },
  {
    icon: RefreshCw,
    title: "Measure Again",
    body:
      "We re-run your prompts on a schedule so you can see whether visibility actually improved — not just whether work got done.",
  },
];

export default function GEOProductLoop() {
  return (
    <section id="how-it-works" className="gradient-bg py-20 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#777773] mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#171717] leading-tight mb-4">
            One loop, always running.
          </h2>
          <p className="text-[#777773] max-w-xl mx-auto text-lg">
            Not a one-time audit — a continuous system for improving how AI talks about
            your business.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="relative">
              <div
                className="bg-white rounded-2xl border border-gray-100 p-6 h-full flex flex-col"
                style={{ boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0">
                    <Icon size={17} className="text-white" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-bold text-[#CBD5E1]">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-bold text-[#171717] text-base mb-2">{title}</h3>
                <p className="text-sm text-[#777773] leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
