import { Phone, Zap, Globe, PhoneCall } from "lucide-react";

const ITEMS = [
  {
    icon: <Phone size={22} className="text-[#2563EB]" aria-hidden="true" />,
    stat: "24/7",
    label: "Always Answering",
  },
  {
    icon: <Zap size={22} className="text-[#2563EB]" aria-hidden="true" />,
    stat: "Instant",
    label: "Lead Follow-Up",
  },
  {
    icon: <Globe size={22} className="text-[#2563EB]" aria-hidden="true" />,
    stat: "50+",
    label: "Languages",
  },
  {
    icon: <PhoneCall size={22} className="text-[#2563EB]" aria-hidden="true" />,
    stat: "Every Call",
    label: "Gets Attention",
  },
];

export default function TrustStrip() {
  return (
    <section className="bg-[#EFF6FF] border-y border-[#DBEAFE] py-10 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
        {ITEMS.map(({ icon, stat, label }) => (
          <div
            key={stat + label}
            className="flex flex-col items-center text-center gap-2.5 bg-white rounded-2xl px-6 py-5 border border-[#DBEAFE]"
            style={{ boxShadow: "0 1px 6px rgba(37,99,235,0.06)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
              {icon}
            </div>
            <p className="text-2xl font-black text-[#0F172A]">{stat}</p>
            <p className="text-sm text-[#64748B] font-medium leading-tight">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
