import Image from "next/image";
import { Check } from "lucide-react";
import StripeCheckoutButton from "./StripeCheckoutButton";

const ctaClass =
  "inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-semibold px-6 py-3.5 rounded-[4px] transition-colors disabled:opacity-70 w-full sm:w-auto";

export default function LandingHero() {
  return (
    <section className="max-w-[1120px] mx-auto px-4 sm:px-6 pt-10 pb-16 sm:pt-16 sm:pb-20">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 items-center">
        <div>
          <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-[#2563EB] mb-4">
            Start your own AI business
          </p>
          <h1 className="text-[32px] sm:text-[44px] lg:text-[48px] font-bold leading-[1.1] tracking-[-0.035em] text-[#171717]">
            Build an AI business helping companies get found in AI search.
          </h1>
          <p className="mt-5 text-[16px] sm:text-[18px] leading-7 text-[#6B6B67] max-w-[540px]">
            Learn how to find businesses missing from ChatGPT, Gemini, and AI search
            results, then offer them an ongoing AI visibility service.
          </p>
          <p className="mt-4 text-[13px] text-[#737370]">
            No coding required · Instant access · One-time payment
          </p>
          <div className="mt-7">
            <StripeCheckoutButton
              endpoint="/api/stripe/launch-kit"
              label="Start my AI business: $97"
              className={ctaClass}
            />
          </div>
          <ul className="mt-6 flex flex-col gap-2 text-[13px] text-[#6B6B67]">
            {[
              "One-time $97 Launch Kit",
              "Academy access right after payment",
              "Agency software is $199 a month, chosen separately",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check size={16} className="text-[#15803D] mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div className="rounded-[4px] border border-[#E5E5E1] bg-white overflow-hidden">
            <Image
              src="/images/start-ai-business/hero.jpg"
              alt="AI Business Launch Kit: training, scripts, templates, and a $97 offer"
              width={1200}
              height={1500}
              priority
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
