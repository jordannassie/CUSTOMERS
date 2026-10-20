"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { VideoAdPackageId } from "@/modules/video-ads/packages";

const variants = {
  primary:
    "bg-[#0866F5] text-white hover:bg-[#0757D4] shadow-sm",
  outline:
    "bg-white text-[#171717] border border-[#E5E5E1] hover:bg-[#F5F5F2]",
} as const;

export function CheckoutButton({
  packageId,
  label,
  checkoutReady,
  variant = "primary",
  wide = false,
}: {
  packageId: VideoAdPackageId;
  label: string;
  checkoutReady: boolean;
  variant?: keyof typeof variants;
  wide?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const className = `inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0866F5] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${variants[variant]} ${wide ? "w-full" : ""}`;

  if (!checkoutReady) {
    return (
      <Link href="/contact" className={className}>
        {label}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    );
  }

  async function startCheckout() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/video-ads/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? "Checkout could not be started. You have not been charged.");
        setPending(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Checkout could not be started. You have not been charged.");
      setPending(false);
    }
  }

  return (
    <div className={wide ? "w-full" : undefined}>
      <button type="button" className={className} onClick={startCheckout} disabled={pending} aria-busy={pending}>
        {pending ? "Starting checkout…" : label}
        {pending ? null : <ArrowRight size={16} aria-hidden="true" />}
      </button>
      {error ? (
        <p className="mt-2 text-[13px] text-[#991B1B]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
