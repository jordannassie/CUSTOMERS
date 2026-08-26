"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface BillingPortalButtonProps {
  businessId: string;
  children: React.ReactNode;
  className?: string;
}

/** Opens the Stripe Customer Portal for subscription management. */
export default function BillingPortalButton({
  businessId,
  children,
  className = "",
}: BillingPortalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not open billing portal.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`${className} disabled:opacity-60`}
        aria-busy={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Opening portal…
          </span>
        ) : (
          children
        )}
      </button>
      {error && (
        <p className="text-[11px] text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
