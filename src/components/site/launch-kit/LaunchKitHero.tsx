import { Check, FileText, DollarSign, MessageSquare } from "lucide-react";
import LaunchKitVideo from "./LaunchKitVideo";
import LaunchKitOfferCard from "./LaunchKitOfferCard";

const FEATURES = ["One-time payment", "Instant access", "Step-by-step training"];

const RESOURCES = [
  { icon: MessageSquare, label: "Sales scripts" },
  { icon: FileText, label: "Proposal template" },
  { icon: DollarSign, label: "Pricing guide" },
];

export default function LaunchKitHero({ hasVideo }: { hasVideo: boolean }) {
  return (
    <section className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-8 pb-12 sm:pt-12 sm:pb-16">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-10 items-start">
        <div>
          <p className="inline-flex text-[11px] font-semibold tracking-wider uppercase text-brand bg-brand-tint border border-brand-tint-2 rounded-full px-3 py-1">
            AI Business Launch Kit
          </p>
          <h1 className="font-serif font-normal mt-4 text-[32px] sm:text-[44px] lg:text-[48px] leading-[1.08] text-foreground">
            Get the AI Business Launch Kit for{" "}
            <span className="text-brand">$97</span>.
          </h1>
          <p className="mt-4 text-[16px] sm:text-[18px] leading-7 text-muted-foreground max-w-[560px]">
            Everything you need to start your own AI visibility business and get your
            first client, fast.
          </p>
          <ul className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4">
            {FEATURES.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[14px] text-foreground">
                <span className="w-5 h-5 rounded-full bg-brand-tint flex items-center justify-center shrink-0">
                  <Check size={12} className="text-brand" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <LaunchKitVideo hasVideo={hasVideo} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {RESOURCES.map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-surface px-2 sm:px-3 py-3 text-center"
              >
                <item.icon size={16} className="mx-auto text-brand" aria-hidden="true" />
                <p className="mt-1.5 text-[11px] sm:text-[12px] font-semibold text-foreground leading-4">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-24">
          <LaunchKitOfferCard />
        </div>
      </div>
    </section>
  );
}
