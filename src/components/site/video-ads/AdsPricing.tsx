import { Check } from "lucide-react";
import { VIDEO_AD_PACKAGES } from "@/modules/video-ads/packages";
import { CheckoutButton } from "./CheckoutButton";

export function AdsPricing({ checkoutReady }: { checkoutReady: boolean }) {
  return (
    <section id="pricing" className="scroll-mt-28 py-20 sm:py-24">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-serif font-normal text-[32px] text-foreground sm:text-[40px]">
            Professional AI Ads. Simple Pricing.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            One-time purchase. No subscription for video ads.
          </p>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
          {VIDEO_AD_PACKAGES.map((pack) => (
            <article
              key={pack.id}
              className={`flex flex-col rounded-xl bg-surface p-7 ${
                pack.featured
                  ? "border-2 border-brand"
                  : "border-2 border-transparent"
              }`}
            >
              {pack.featured ? (
                <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-brand">Start here</p>
              ) : (
                <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">One-time</p>
              )}
              <h3 className="font-serif font-normal text-[20px] text-foreground">{pack.name}</h3>
              <p className="mt-2 text-[40px] font-bold tabular-nums tracking-tight text-foreground">{pack.priceLabel}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">One-time payment</p>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {pack.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[14px] text-foreground">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <CheckoutButton
                  packageId={pack.id}
                  label={pack.cta}
                  checkoutReady={checkoutReady}
                  variant={pack.featured ? "primary" : "outline"}
                  wide
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
