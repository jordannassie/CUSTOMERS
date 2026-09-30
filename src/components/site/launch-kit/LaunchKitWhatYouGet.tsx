import type { ReactNode } from "react";
import { Check, FileText, MessageSquare, Play, DollarSign } from "lucide-react";

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E5E1] bg-white p-4 shadow-[0_8px_24px_rgba(23,23,23,0.06)] flex flex-col min-h-[220px]">
      <div className="flex-1">{children}</div>
      <h3 className="mt-3 text-[14px] font-semibold text-[#171717]">{title}</h3>
    </div>
  );
}

export default function LaunchKitWhatYouGet() {
  return (
    <section className="bg-[#FAFAF8] border-t border-[#E5E5E1]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-14 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0866F5] mb-2">
          What you get
        </p>
        <h2 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[#171717] max-w-[640px]">
          Everything you need to get your first client.
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-[#6B6B67] max-w-[640px]">
          Step-by-step training, proven templates and live software to help you start
          and grow your AI business.
        </p>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card title="AI Business Launch Training">
            <div className="relative rounded-xl overflow-hidden aspect-[16/10] bg-[#171717]">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-10 h-10 rounded-full bg-[#0866F5] flex items-center justify-center">
                  <Play size={16} className="text-white ml-0.5" fill="white" />
                </span>
              </div>
              <p className="absolute bottom-2 left-2 text-[10px] text-white/80">Preview</p>
            </div>
            <p className="mt-2 text-[12px] text-[#6B6B67] leading-4">
              Simple step-by-step videos showing how the model works.
            </p>
          </Card>

          <Card title="Your Offer">
            <div className="rounded-xl border border-[#E5E5E1] bg-[#FAFAF8] p-2 space-y-1.5">
              {[
                ["Starter", "$500/mo"],
                ["Growth", "$1,000/mo"],
                ["Pro", "$2,000/mo"],
              ].map(([name, price]) => (
                <div
                  key={name}
                  className={`flex justify-between text-[11px] px-2 py-1.5 rounded-lg ${
                    name === "Growth" ? "bg-[#EFF6FF] text-[#0866F5] font-semibold" : "text-[#171717]"
                  }`}
                >
                  <span>{name}</span>
                  <span className="tabular-nums">{price}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-[#6B6B67] leading-4">
              Exactly what service to sell and how to explain it.
            </p>
          </Card>

          <Card title="Prospecting Scripts">
            <div className="rounded-xl border border-[#E5E5E1] bg-[#FAFAF8] p-3 text-[11px] leading-4 text-[#6B6B67]">
              Hi. I checked how your business appears in ChatGPT. A few competitors
              are showing up ahead of you. Want the report?
            </div>
            <p className="mt-2 text-[12px] text-[#6B6B67] leading-4">
              DM, email and text templates for reaching local businesses.
            </p>
          </Card>

          <Card title="Proposal Template">
            <div className="rounded-xl border border-[#E5E5E1] bg-white p-3 shadow-inner">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={14} className="text-[#0866F5]" />
                <span className="text-[11px] font-semibold text-[#171717]">AI visibility proposal</span>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-[#E5E5E1] rounded w-full" />
                <div className="h-1.5 bg-[#E5E5E1] rounded w-4/5" />
                <div className="h-1.5 bg-[#EFF6FF] rounded w-3/5" />
              </div>
            </div>
            <p className="mt-2 text-[12px] text-[#6B6B67] leading-4">
              A copy-and-paste proposal you can send to clients.
            </p>
          </Card>

          <Card title="Pricing Guide">
            <div className="rounded-xl border border-[#E5E5E1] p-3 space-y-1.5">
              {[
                ["Basic", "$500/mo"],
                ["Growth", "$1,000/mo"],
                ["Pro", "$2,000/mo"],
              ].map(([name, price]) => (
                <div key={name} className="flex justify-between text-[12px] text-[#171717]">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={12} className="text-[#0866F5]" />
                    {name}
                  </span>
                  <span className="tabular-nums font-semibold">{price}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-[#6B6B67] leading-4">
              How to create your monthly packages and position your value.
            </p>
          </Card>

          <Card title="Live Software Access">
            <div className="rounded-xl border border-[#E5E5E1] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B6B67] mb-2">
                AI visibility comparison
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#F5F5F2] p-2 text-center">
                  <p className="text-[18px] font-bold tabular-nums text-[#6B6B67]">42%</p>
                  <p className="text-[10px] text-[#737370]">You</p>
                </div>
                <div className="rounded-lg bg-[#EFF6FF] p-2 text-center">
                  <p className="text-[18px] font-bold tabular-nums text-[#0866F5]">81%</p>
                  <p className="text-[10px] text-[#737370]">Top competitor</p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-[#6B6B67] leading-4">
              Use Customers.Direct to run reports and find opportunities.
            </p>
          </Card>

          <Card title="First Client Checklist">
            <ul className="space-y-1.5">
              {[
                "Find 20 local businesses",
                "Run free AI reports",
                "Send your message",
                "Show the report",
                "Close your first client",
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-[11px] text-[#171717]">
                  <Check size={12} className="text-[#0866F5] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Bonus Resources">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                "Outreach spreadsheet",
                "Client report template",
                "Follow-up sequence",
                "Presentation deck",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-[#E5E5E1] bg-[#FAFAF8] px-2 py-2 text-[10px] leading-3 text-[#171717] flex items-start gap-1"
                >
                  <MessageSquare size={10} className="text-[#0866F5] mt-0.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
