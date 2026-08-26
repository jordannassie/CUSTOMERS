"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { PlanId } from "@/lib/plans";

interface CheckoutButtonProps {
  planId: PlanId;
  businessId?: string;
  /** Shown when Stripe is not configured on the server */
  fallbackHref?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Hits /api/stripe/checkout and redirects to the Stripe-hosted checkout page.
 *
 * When no businessId is provided (e.g. on the public pricing page before login),
 * the button links to /signup?plan=<planId> so the user signs up first.
 * After signup the dashboard settings page handles upgrade.
 */
export default function CheckoutButton({
  planId,
  businessId,
  fallbackHref = "/signup",
  children,
  className = "",
  disabled = false,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If no businessId, send user to sign up first
  if (!businessId) {
    return (
      <a href={`${fallbackHref}?plan=${planId}`} className={className}>
        {children}
      </a>
    );
  }

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, businessId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
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
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className={`${className} disabled:opacity-60`}
        aria-busy={loading}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Redirecting…
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
