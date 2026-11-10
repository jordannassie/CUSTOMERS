import Link from "next/link";
import { ArrowRight, BadgeCheck, Clapperboard, MonitorSmartphone, Timer } from "lucide-react";
import { CheckoutButton } from "./CheckoutButton";

const POINTS = [
  { icon: Timer, label: "15-Second Video Ads" },
  { icon: MonitorSmartphone, label: "Made for TikTok, Instagram & Facebook" },
  { icon: Clapperboard, label: "AI-Powered Production" },
  { icon: BadgeCheck, label: "One-Time Pricing" },
] as const;

export function AdsHero({
  checkoutReady,
  canceled,
}: {
  checkoutReady: boolean;
  canceled: boolean;
}) {
  return (
    <section className="mx-auto max-w-[calc(1120px*var(--px,1))] px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
      {canceled ? (
        <p className="mx-auto mb-8 max-w-xl rounded-xl border border-[#E5E5E1] bg-white px-4 py-3 text-center text-[length:calc(14px*var(--px,1))] text-[#171717]" role="status">
          Checkout was canceled. You have not been charged.
        </p>
      ) : null}
      {!checkoutReady ? (
        <p className="mx-auto mb-8 max-w-xl rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-center text-[length:calc(14px*var(--px,1))] text-[#92400E]" role="status">
          Online checkout is not connected yet, so the order buttons do not charge a card. Use contact and we will take the order by hand.
        </p>
      ) : null}
      <div className="mx-auto max-w-3xl text-center fade-up">
        <p className="mb-5 inline-flex rounded-full border border-[#E5E5E1] bg-white px-3 py-1 text-[length:calc(11px*var(--px,1))] font-semibold tracking-[0.14em] text-[#777773]">
          AI VIDEO ADS FOR BRANDS
        </p>
        <h1 className="text-[length:calc(40px*var(--px,1))] font-bold leading-[1.05] tracking-tight text-[#171717] sm:text-[length:calc(60px*var(--px,1))]">
          Scroll-Stopping AI Video Ads.
        </h1>
        <p className="mt-4 text-[length:calc(32px*var(--px,1))] font-bold tracking-tight text-[#0866F5] sm:text-[length:calc(44px*var(--px,1))]">Just $99.</p>
        <p className="mx-auto mt-5 max-w-xl text-[length:calc(16px*var(--px,1))] leading-relaxed text-[#777773] sm:text-[length:calc(18px*var(--px,1))]">
          High-quality, 15-second AI-powered video ads for TikTok, Instagram, and Facebook. No filming. No expensive production. Just fresh creative for your brand.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CheckoutButton packageId="starter" label="Get My $99 Video Ad" checkoutReady={checkoutReady} />
          <Link
            href="#work"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E5E1] bg-white px-6 py-3.5 text-[length:calc(15px*var(--px,1))] font-semibold text-[#171717] transition-colors hover:bg-[#F5F5F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2"
          >
            Watch Our Work
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <ul className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3 rounded-2xl border border-[#E5E5E1] bg-white px-4 py-3">
            <Icon size={18} className="shrink-0 text-[#0866F5]" aria-hidden="true" />
            <span className="text-[length:calc(13px*var(--px,1))] font-semibold text-[#171717]">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
