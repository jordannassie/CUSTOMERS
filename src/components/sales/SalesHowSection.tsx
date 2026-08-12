import { Search, BarChart2, Monitor, CheckCircle, TrendingUp, ArrowRight } from "lucide-react";

const STEPS = [
  {
    num: "1",
    icon: <Search size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Find a Business",
    body: "Identify service businesses that take customer calls — dental, roofing, HVAC, law firms, med spas, and more.",
  },
  {
    num: "2",
    icon: <BarChart2 size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Show the Problem",
    body: "Walk them through the missed call problem. Most business owners have already experienced losing a customer to a missed call.",
  },
  {
    num: "3",
    icon: <Monitor size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Demo the AI Receptionist",
    body: "Show the prospect exactly how an AI receptionist would handle their calls, using a demo built around their business.",
  },
  {
    num: "4",
    icon: <CheckCircle size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Close the Customer",
    body: "If it fits their business, help them get started. Customers Direct handles the onboarding and setup from there.",
  },
  {
    num: "5",
    icon: <TrendingUp size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Track Your Customers & Commissions",
    body: "Use the Sales Dashboard to track your pipeline, customers, and commission activity in one place.",
  },
];

export default function SalesHowSection() {
  return (
    <section className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            How Sales Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] leading-tight max-w-xl mx-auto">
            Five steps from prospect to commission.
          </h2>
        </div>

        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          {STEPS.map(({ num, icon, title, body }, i) => (
            <div key={num}>
              <div
                className="flex items-start gap-5 bg-white border border-gray-100 rounded-2xl px-6 py-5"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
              >
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center">
                    {icon}
                  </div>
                  <span className="text-[10px] font-black text-[#DBEAFE]">{num}</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#0F172A] text-base mb-1">{title}</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">{body}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex justify-center my-1" aria-hidden="true">
                  <ArrowRight size={16} className="text-[#DBEAFE] rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a
            href="/sales/dashboard"
            className="inline-flex items-center gap-2 bg-[#EFF6FF] border border-[#DBEAFE] text-[#2563EB] font-bold px-7 py-4 rounded-full hover:bg-[#DBEAFE] transition-colors text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <Monitor size={16} aria-hidden="true" />
            Preview the Sales Dashboard
          </a>
        </div>
      </div>
    </section>
  );
}
