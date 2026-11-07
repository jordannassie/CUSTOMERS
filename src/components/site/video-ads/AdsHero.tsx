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
    <section className="mx-auto max-w-[1120px] px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
      {canceled ? (
        <p className="mx-auto mb-8 max-w-xl rounded-xl bg-surface px-4 py-3 text-center text-[14px] text-foreground" role="status">
          Checkout was canceled. You have not been charged.
        </p>
      ) : null}
      {!checkoutReady ? (
        <p className="mx-auto mb-8 max-w-xl rounded-xl border border-rival-mark bg-rival-tint px-4 py-3 text-center text-[14px] text-rival-ink" role="status">
          Online checkout is not connected yet, so the order buttons do not charge a card. Use contact and we will take the order by hand.
        </p>
      ) : null}
      <div className="mx-auto max-w-3xl text-center fade-up">
        <p className="mb-5 inline-flex rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
          AI VIDEO ADS FOR BRANDS
        </p>
        <h1 className="font-display font-semibold text-[40px] leading-[1.05] text-foreground sm:text-[60px]">
          Scroll-Stopping AI Video Ads.
        </h1>
        <p className="mt-4 text-[32px] font-bold tracking-tight text-brand sm:text-[44px]">Just $99.</p>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground sm:text-[18px]">
          High-quality, 15-second AI-powered video ads for TikTok, Instagram, and Facebook. No filming. No expensive production. Just fresh creative for your brand.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <CheckoutButton packageId="starter" label="Get My $99 Video Ad" checkoutReady={checkoutReady} />
          <Link
            href="#work"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-surface px-6 py-3.5 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Watch Our Work
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <ul className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
            <Icon size={18} className="shrink-0 text-brand" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-foreground">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
