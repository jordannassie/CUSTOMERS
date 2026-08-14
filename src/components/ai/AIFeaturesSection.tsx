import {
  Phone,
  ClipboardList,
  Calendar,
  FileText,
  PhoneCall,
  BookOpen,
  Globe,
  MessageSquare,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Phone size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "24/7 Call Answering",
    body: "Never depend on office hours to answer a new inquiry.",
  },
  {
    icon: <ClipboardList size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Lead Qualification",
    body: "Ask the questions that matter before your team follows up.",
  },
  {
    icon: <Calendar size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Appointment Booking",
    body: "Send booking links during the conversation.",
  },
  {
    icon: <FileText size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Instant Lead Summaries",
    body: "Receive the caller, request, urgency, and next action after every call.",
  },
  {
    icon: <PhoneCall size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Keep Your Number",
    body: "Your existing business number can remain the number your customers know.",
  },
  {
    icon: <BookOpen size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Custom Business Knowledge",
    body: "Train your AI Employee around your services, hours, policies, FAQs, and preferred tone.",
  },
  {
    icon: <Globe size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Multilingual Conversations",
    body: "Help customers in many different languages.",
  },
  {
    icon: <MessageSquare size={20} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Smart Customer Texting",
    body: "Send useful links and next steps while the customer is still engaged.",
  },
];

export default function AIFeaturesSection() {
  return (
    <section id="features" className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Headline */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F172A] leading-tight max-w-2xl mx-auto">
            Everything your AI Employee needs to capture the opportunity.
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon, title, body }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#DBEAFE] hover:shadow-md transition-all"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center mb-4">
                {icon}
              </div>
              <h3 className="font-bold text-[#0F172A] text-sm mb-2 leading-snug">{title}</h3>
              <p className="text-sm text-[#64748B] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
