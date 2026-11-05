import { ArrowRight } from "lucide-react";
import { getLaunchKitPaymentUrl } from "@/config/launch-kit-page";

type Variant = "blue" | "dark" | "blueWide";

const variants: Record<Variant, string> = {
  blue: "bg-brand hover:bg-brand-strong text-white rounded-full px-6 py-3.5 text-[15px]",
  dark: "bg-foreground hover:bg-foreground text-white rounded-xl px-6 py-4 text-[16px] w-full",
  blueWide:
    "bg-brand hover:bg-brand-strong text-white rounded-full px-8 py-3.5 text-[15px] w-full",
};

export default function LaunchKitBuyButton({
  variant = "blue",
  showArrow = false,
  label = "Buy now: $97",
}: {
  variant?: Variant;
  showArrow?: boolean;
  label?: string;
}) {
  const href = getLaunchKitPaymentUrl();
  const className = `inline-flex items-center justify-center gap-2 font-semibold transition-colors ${variants[variant]}`;

  if (!href) {
    return (
      <div>
        <button type="button" disabled className={`${className} opacity-60 cursor-not-allowed`}>
          {label}
        </button>
        <p className="mt-2 text-[13px] text-muted-foreground">Stripe payment link will be connected here.</p>
      </div>
    );
  }

  return (
    <a href={href} className={className}>
      {label}
      {showArrow ? <ArrowRight size={16} aria-hidden="true" /> : null}
    </a>
  );
}
