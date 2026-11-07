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
    <section className="bg-background">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-12 sm:py-16 grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-xl bg-brand-tint p-6 sm:p-8 flex flex-col">
          <p className="inline-flex self-start text-[11px] font-semibold uppercase tracking-wider text-brand bg-surface border border-brand-tint-2 rounded-full px-3 py-1">
            Get started today
          </p>
          <h2 className="font-display font-semibold mt-4 text-[28px] sm:text-[32px] text-foreground">
            Start your AI business for only $97.
          </h2>
          <p className="mt-3 text-[15px] text-muted-foreground">
            One-time payment. Instant access. No monthly fees.
          </p>
          <div className="mt-6">
            <LaunchKitBuyButton variant="blueWide" showArrow label="Buy now: $97" />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {BENEFITS.map((item) => (
              <div key={item.label} className="text-center">
                <item.icon size={18} className="mx-auto text-brand" aria-hidden="true" />
                <p className="mt-2 text-[12px] font-semibold text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <LaunchKitFaq />
      </div>
    </section>
  );
}
