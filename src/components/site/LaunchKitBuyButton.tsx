import { ArrowRight } from "lucide-react";
import { getLaunchKitPaymentUrl } from "@/config/launch-kit-page";

const buttonClass =
  "inline-flex items-center justify-center gap-2 bg-[#0866F5] hover:bg-[#0757D4] text-white text-[15px] font-semibold px-6 py-3.5 rounded-xl transition-colors w-full sm:w-auto";

export default function LaunchKitBuyButton() {
  const href = getLaunchKitPaymentUrl();

  if (!href) {
    return (
      <div>
        <button type="button" disabled className={`${buttonClass} opacity-60 cursor-not-allowed`}>
          Buy now: $97
        </button>
        <p className="mt-2 text-[13px] text-[#737370]">Stripe payment link will be connected here.</p>
      </div>
    );
  }

  return (
    <a href={href} className={buttonClass}>
      Buy now: $97
      <ArrowRight size={16} aria-hidden="true" />
    </a>
  );
}
