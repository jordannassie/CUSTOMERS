import { BookOpen, Settings, PhoneCall } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: <BookOpen size={22} className="text-[#2563EB]" aria-hidden="true" />,
    title: "We Learn Your Business",
    body: "We use your website, services, hours, common questions, scheduling process, and business rules to configure your receptionist.",
  },
  {
    num: "02",
    icon: <Settings size={22} className="text-[#2563EB]" aria-hidden="true" />,
    title: "We Build Your AI Receptionist",
    body: "We configure the voice, greeting, qualifying questions, business knowledge, and call handling to match how your business works.",
  },
  {
    num: "03",
    icon: <PhoneCall size={22} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Your AI Starts Answering",
    body: "Customers get help immediately and qualified lead information is sent back to your business after every call.",
  },
];

export default function AIHowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#EFF6FF] py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow + Headline */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            Simple Setup
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight">
            Your new receptionist in three steps.
          </h2>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Desktop connector line */}
          <div
            className="hidden md:block absolute top-10 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-transparent via-[#DBEAFE] to-transparent"
            aria-hidden="true"
          />

          {STEPS.map(({ num, icon, title, body }) => (
            <div
              key={num}
              className="bg-white rounded-2xl p-8 border border-[#DBEAFE] flex flex-col gap-5"
              style={{ boxShadow: "0 2px 12px rgba(37,99,235,0.07)" }}
            >
              {/* Icon + number row */}
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center">
                  {icon}
                </div>
                <span className="text-5xl font-black text-[#DBEAFE]">{num}</span>
              </div>

              <div>
                <h3 className="font-bold text-[#0F172A] text-lg mb-2 leading-snug">{title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
