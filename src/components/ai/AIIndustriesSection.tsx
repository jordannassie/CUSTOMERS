import {
  Sparkles,
  Smile,
  Scale,
  Hammer,
  Thermometer,
  Wrench,
  Home,
  Scissors,
  Building,
} from "lucide-react";

const INDUSTRIES = [
  {
    icon: <Sparkles size={22} className="text-[#7C3AED]" aria-hidden="true" />,
    name: "Med Spas",
    desc: "Consultations and appointment inquiries answered automatically.",
    bg: "bg-[#F5F3FF] border-[#EDE9FE]",
    iconBg: "bg-[#EDE9FE]",
  },
  {
    icon: <Smile size={22} className="text-[#2563EB]" aria-hidden="true" />,
    name: "Dental",
    desc: "New patients, appointment requests, and common questions.",
    bg: "bg-[#EFF6FF] border-[#DBEAFE]",
    iconBg: "bg-[#DBEAFE]",
  },
  {
    icon: <Scale size={22} className="text-[#7C3AED]" aria-hidden="true" />,
    name: "Law Firms",
    desc: "Capture and qualify new client inquiries.",
    bg: "bg-[#F5F3FF] border-[#EDE9FE]",
    iconBg: "bg-[#EDE9FE]",
  },
  {
    icon: <Hammer size={22} className="text-[#2563EB]" aria-hidden="true" />,
    name: "Roofing",
    desc: "Handle storm and inspection inquiries even when crews are busy.",
    bg: "bg-[#EFF6FF] border-[#DBEAFE]",
    iconBg: "bg-[#DBEAFE]",
  },
  {
    icon: <Thermometer size={22} className="text-[#7C3AED]" aria-hidden="true" />,
    name: "HVAC",
    desc: "Capture urgent heating and cooling calls.",
    bg: "bg-[#F5F3FF] border-[#EDE9FE]",
    iconBg: "bg-[#EDE9FE]",
  },
  {
    icon: <Wrench size={22} className="text-[#2563EB]" aria-hidden="true" />,
    name: "Plumbing",
    desc: "Answer service requests and dispatch information quickly.",
    bg: "bg-[#EFF6FF] border-[#DBEAFE]",
    iconBg: "bg-[#DBEAFE]",
  },
  {
    icon: <Home size={22} className="text-[#7C3AED]" aria-hidden="true" />,
    name: "Real Estate",
    desc: "Qualify buyer and seller inquiries around the clock.",
    bg: "bg-[#F5F3FF] border-[#EDE9FE]",
    iconBg: "bg-[#EDE9FE]",
  },
  {
    icon: <Scissors size={22} className="text-[#2563EB]" aria-hidden="true" />,
    name: "Salons",
    desc: "Book appointments and answer service questions instantly.",
    bg: "bg-[#EFF6FF] border-[#DBEAFE]",
    iconBg: "bg-[#DBEAFE]",
  },
  {
    icon: <Building size={22} className="text-[#7C3AED]" aria-hidden="true" />,
    name: "Home Services",
    desc: "Capture every service call and keep customers informed.",
    bg: "bg-[#F5F3FF] border-[#EDE9FE]",
    iconBg: "bg-[#EDE9FE]",
  },
];

export default function AIIndustriesSection() {
  return (
    <section id="industries" className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Eyebrow + Headline */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            Built for Service Businesses
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight max-w-2xl mx-auto mb-4">
            If customers call you, this can help you.
          </h2>
        </div>

        {/* Industry grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {INDUSTRIES.map(({ icon, name, desc, bg, iconBg }) => (
            <div
              key={name}
              className={`rounded-2xl border p-6 flex items-start gap-4 hover:shadow-md transition-all ${bg}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                {icon}
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] text-base mb-1">{name}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
