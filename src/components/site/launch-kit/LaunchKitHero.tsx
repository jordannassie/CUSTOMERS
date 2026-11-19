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
    <section className="max-w-[calc(1120px*var(--px,1))] mx-auto px-4 sm:px-6 pt-8 pb-12 sm:pt-12 sm:pb-16">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_calc(340px*var(--px,1))] xl:grid-cols-[minmax(0,1fr)_calc(380px*var(--px,1))] gap-8 lg:gap-10 items-start">
        <div>
          <p className="inline-flex text-[length:calc(11px*var(--px,1))] font-semibold tracking-wider uppercase text-[#0866F5] bg-primary-tint border border-[#BFDBFE] rounded-full px-3 py-1">
            AI Business Launch Kit
          </p>
          <h1 className="mt-4 text-[length:calc(32px*var(--px,1))] sm:text-[length:calc(44px*var(--px,1))] lg:text-[length:calc(48px*var(--px,1))] font-bold leading-[1.08] tracking-tight text-foreground">
            Get the AI Business Launch Kit for{" "}
            <span className="text-[#0866F5]">$97</span>.
          </h1>
          <p className="mt-4 text-[length:calc(16px*var(--px,1))] sm:text-[length:calc(18px*var(--px,1))] leading-7 text-muted-foreground max-w-[calc(560px*var(--px,1))]">
            Everything you need to start your own AI visibility business and get your
            first client, fast.
          </p>
          <ul className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4">
            {FEATURES.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[length:calc(14px*var(--px,1))] text-foreground">
                <span className="w-5 h-5 rounded-full bg-primary-tint flex items-center justify-center shrink-0">
                  <Check size={12} className="text-[#0866F5]" aria-hidden="true" />
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
                className="rounded-xl border border-border bg-white px-2 sm:px-3 py-3 text-center shadow-[0_4px_16px_rgba(23,23,23,0.05)]"
              >
                <item.icon size={16} className="mx-auto text-[#0866F5]" aria-hidden="true" />
                <p className="mt-1.5 text-[length:calc(11px*var(--px,1))] sm:text-[length:calc(12px*var(--px,1))] font-semibold text-foreground leading-4">
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
