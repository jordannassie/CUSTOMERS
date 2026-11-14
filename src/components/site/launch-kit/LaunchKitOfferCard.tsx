import { Check, Lock, Shield } from "lucide-react";
import Image from "next/image";
import LaunchKitBuyButton from "@/components/site/LaunchKitBuyButton";
import { LAUNCH_KIT_AD_IMAGE } from "@/config/launch-kit-assets";

const INCLUDED = [
  "Step-by-step video training",
  "Sales scripts and templates",
  "Pricing guide",
  "Live software walkthrough",
  "First client checklist",
  "Bonus resources",
];

const PAY_MARKS = ["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"];

export default function LaunchKitOfferCard() {
  return (
    <aside className="rounded-2xl overflow-hidden border border-border bg-white shadow-[0_16px_48px_rgba(23,23,23,0.10)]">
      <div className="bg-[#0866F5] px-5 py-3 flex items-center justify-between text-white">
        <span className="text-[length:calc(13px*var(--px,1))] font-semibold">Customers.Direct</span>
        <span className="flex items-center gap-1.5 text-[length:calc(11px*var(--px,1))] font-medium text-white/90">
          <Lock size={12} aria-hidden="true" />
          Secure checkout
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-14 h-16 rounded-lg overflow-hidden border border-border shrink-0 bg-muted">
            <Image
              src={LAUNCH_KIT_AD_IMAGE}
              alt=""
              width={112}
              height={128}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-[length:calc(16px*var(--px,1))] font-bold text-foreground">AI Business Launch Kit</h2>
            <p className="mt-0.5 text-[length:calc(13px*var(--px,1))] text-muted-foreground">One-time payment. Instant access.</p>
          </div>
        </div>

        <ul className="mt-5 space-y-2.5">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[length:calc(13px*var(--px,1))] text-foreground">
              <Check size={15} className="text-[#0866F5] mt-0.5 shrink-0" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-[length:calc(40px*var(--px,1))] font-bold tabular-nums leading-none text-foreground">$97</p>
          <p className="mt-1 text-[length:calc(13px*var(--px,1))] text-muted-foreground">One-time payment</p>
          <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground">No monthly fees</p>
        </div>

        <div className="mt-5">
          <LaunchKitBuyButton variant="dark" />
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[length:calc(12px*var(--px,1))] text-muted-foreground">
          <Lock size={12} aria-hidden="true" />
          Secure checkout powered by Stripe
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {PAY_MARKS.map((mark) => (
            <span
              key={mark}
              className="text-[length:calc(10px*var(--px,1))] font-semibold tracking-wide text-muted-foreground border border-border rounded-md px-2 py-1 bg-background"
            >
              {mark}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-border bg-background px-5 py-4 flex gap-3">
        <Shield size={18} className="text-[#0866F5] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-[length:calc(13px*var(--px,1))] font-semibold text-foreground">30-day money-back guarantee</p>
          <p className="mt-0.5 text-[length:calc(12px*var(--px,1))] leading-5 text-muted-foreground">
            Try it risk-free. If it is not for you, get a full refund within 30 days.
          </p>
        </div>
      </div>
    </aside>
  );
}
