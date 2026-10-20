import { Clock, Headphones, Shield } from "lucide-react";
import LaunchKitBuyButton from "@/components/site/LaunchKitBuyButton";
import LaunchKitFaq from "./LaunchKitFaq";

const BENEFITS = [
  { icon: Clock, label: "Instant access", detail: "Get started right away." },
  { icon: Shield, label: "30-day guarantee", detail: "Try it risk-free." },
  { icon: Headphones, label: "Support", detail: "We are here to help." },
];

export default function LaunchKitBottom() {
  return (
    <section className="bg-white border-t border-[#E5E5E1]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-12 sm:py-16 grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-3xl bg-[#EFF6FF] border border-[#BFDBFE] p-6 sm:p-8 flex flex-col">
          <p className="inline-flex self-start text-[11px] font-semibold uppercase tracking-wider text-[#0866F5] bg-white border border-[#BFDBFE] rounded-full px-3 py-1">
            Get started today
          </p>
          <h2 className="mt-4 text-[28px] sm:text-[32px] font-bold tracking-tight text-[#171717]">
            Start your AI business for only $97.
          </h2>
          <p className="mt-3 text-[15px] text-[#6B6B67]">
            One-time payment. Instant access. No monthly fees.
          </p>
          <div className="mt-6">
            <LaunchKitBuyButton variant="blueWide" showArrow label="Buy now: $97" />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {BENEFITS.map((item) => (
              <div key={item.label} className="text-center">
                <item.icon size={18} className="mx-auto text-[#0866F5]" aria-hidden="true" />
                <p className="mt-2 text-[12px] font-semibold text-[#171717]">{item.label}</p>
                <p className="text-[11px] text-[#6B6B67]">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <LaunchKitFaq />
      </div>
    </section>
  );
}
