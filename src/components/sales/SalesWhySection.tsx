import { Lightbulb, Monitor, RefreshCw, Settings } from "lucide-react";

const CARDS = [
  {
    icon: <Lightbulb size={22} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Simple Problem",
    body: "Every business understands the cost of a missed customer call. You don't need to explain the concept — you just need to show the solution.",
  },
  {
    icon: <Monitor size={22} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Live Demonstration",
    body: "Prospects can experience the AI Employee in action instead of only hearing a sales pitch. Seeing it work is the most powerful part of the conversation.",
  },
  {
    icon: <RefreshCw size={22} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Recurring Service",
    body: "Customers use the service month after month while it remains valuable to their business. You build a book of business, not just one-time transactions.",
  },
  {
    icon: <Settings size={22} className="text-[#2563EB]" aria-hidden="true" />,
    title: "Customers Direct Handles Delivery",
    body: "Sales representatives focus on prospecting, demos, and closing. Customers Direct handles setup, configuration, and ongoing service.",
  },
];

export default function SalesWhySection() {
  return (
    <section className="bg-[#EFF6FF] py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block text-xs font-black uppercase tracking-widest text-[#64748B] mb-4">
            Why This Product
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0F172A] leading-tight max-w-2xl mx-auto">
            A product businesses already know they need.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CARDS.map(({ icon, title, body }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-[#DBEAFE] p-6 flex flex-col gap-4"
              style={{ boxShadow: "0 2px 12px rgba(37,99,235,0.07)" }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center">
                {icon}
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] text-base mb-2">{title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
