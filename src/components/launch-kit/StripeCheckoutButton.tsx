"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

type Props = {
  endpoint: "/api/stripe/launch-kit" | "/api/stripe/agency-program";
  label: string;
  className?: string;
};

export default function StripeCheckoutButton({ endpoint, label, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout is not available right now. Try again in a moment.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("We could not start checkout. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={
          className ??
          "inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-semibold px-6 py-3 rounded-[4px] transition-colors disabled:opacity-70"
        }
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {label}
        {!loading ? <ArrowRight size={16} /> : null}
      </button>
      {error ? (
        <p className="mt-2 text-[13px] text-[#B91C1C]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
