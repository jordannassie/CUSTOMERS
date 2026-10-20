import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { LAUNCH_KIT_AD_IMAGE } from "@/config/launch-kit-assets";

export default function StartAiBusinessHomeSection() {
  return (
    <section
      id="start-ai-business"
      className="bg-white py-20 sm:py-24 px-4 border-t border-[#EEEEEA] scroll-mt-24"
    >
      <div className="max-w-[1120px] mx-auto grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0866F5] mb-3">
            For entrepreneurs
          </p>
          <h2 className="text-[32px] sm:text-[40px] font-bold text-[#171717] leading-[1.1] tracking-tight">
            Start your own AI business.
          </h2>
          <p className="mt-3 text-[18px] font-medium text-[#171717] max-w-[560px]">
            Help local businesses get discovered in ChatGPT and AI search.
          </p>
          <p className="mt-4 text-[15px] leading-7 text-[#6B6B67] max-w-[560px]">
            Learn how to find local businesses that are being overlooked by AI search,
            show them the opportunity, and sell a simple monthly AI visibility service.
            Get the offer, the scripts, and a plan to start signing monthly clients.
          </p>
          <Link
            href="/start-ai-business"
            className="mt-8 inline-flex items-center gap-2 bg-[#0866F5] hover:bg-[#0757D4] text-white text-[14px] font-semibold px-5 py-3 rounded-xl transition-colors"
          >
            Start my AI business
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="rounded-2xl overflow-hidden border border-[#E5E5E1] shadow-[0_12px_40px_rgba(23,23,23,0.08)]">
          <Image
            src={LAUNCH_KIT_AD_IMAGE}
            alt="A business owner checking how AI search recommends local companies"
            width={1200}
            height={675}
            className="w-full h-auto object-cover"
            sizes="(min-width: 1024px) 520px, 100vw"
          />
        </div>
      </div>
    </section>
  );
}
