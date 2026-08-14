import {
  Phone,
  ClipboardList,
  Calendar,
  FileText,
  PhoneCall,
  BookOpen,
} from "lucide-react";
import LiveCallCard from "./ai/LiveCallCard";

const FEATURES = [
  {
    icon: Phone,
    title: "24/7 AI Answering",
    desc: "Always available when your team can't answer.",
  },
  {
    icon: ClipboardList,
    title: "Qualifies Callers",
    desc: "Ask the questions your team needs answered.",
  },
  {
    icon: Calendar,
    title: "Books Appointments",
    desc: "Send scheduling links during the conversation.",
  },
  {
    icon: BookOpen,
    title: "Answers Business Questions",
    desc: "Configured around your services, hours and FAQs.",
  },
  {
    icon: FileText,
    title: "Lead Summaries",
    desc: "Know who called and exactly what they wanted.",
  },
  {
    icon: PhoneCall,
    title: "Keep Your Existing Number",
    desc: "Customers can continue calling the number they already know.",
  },
];

export default function HomepageAISection() {
  return (
    <section
      id="ai-phone"
      className="py-24 px-4"
      style={{
        background:
          "linear-gradient(160deg, #EFF6FF 0%, #F5F3FF 60%, #EFF6FF 100%)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* LEFT — Copy */}
          <div>
            <span className="inline-block text-xs font-black uppercase tracking-widest text-[#7C3AED] mb-5">
              AI Employee
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#0F172A] leading-[1.08] tracking-tight mb-6">
              Never Miss the Customers{" "}
              <span
                className="text-transparent bg-clip-text block"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
                }}
              >
                You Worked So Hard to Get.
              </span>
            </h2>

            <p className="text-base text-[#64748B] leading-relaxed mb-8 max-w-md">
              Getting the lead is only half the job. Customers Direct AI Employee answers your calls 24/7, talks to customers,
              qualifies opportunities, sends booking links, and tells you
              exactly who called.
            </p>

            {/* Feature bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#DBEAFE] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={15} className="text-[#2563EB]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
                    <p className="text-xs text-[#64748B] leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/ai-phone"
                className="inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white font-bold px-7 py-4 rounded-full hover:bg-[#1d4ed8] transition-colors text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                <PhoneCall size={15} aria-hidden="true" />
                Hear the AI Employee
              </a>
              <a
                href="/ai-phone"
                className="inline-flex items-center justify-center gap-2 border border-[#DBEAFE] bg-white text-[#2563EB] font-semibold px-7 py-4 rounded-full hover:bg-[#EFF6FF] transition-colors text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Learn About AI Employee →
              </a>
            </div>
          </div>

          {/* RIGHT — Live Call Card */}
          <div className="flex justify-center lg:justify-end pt-8 pb-16 lg:py-0">
            <LiveCallCard />
          </div>
        </div>
      </div>
    </section>
  );
}
