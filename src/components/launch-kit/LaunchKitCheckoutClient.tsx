"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import FunnelHeader from "@/components/launch-kit/FunnelHeader";
import SiteFooter from "@/components/site/SiteFooter";

export default function LaunchKitCheckoutClient() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const res = await fetch("/api/stripe/launch-kit", { method: "POST" });
        const data = (await res.json()) as { url?: string; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.url) {
          setError(data.error ?? "Checkout is not available right now.");
          return;
        }
        window.location.href = data.url;
      } catch {
        if (!cancelled) setError("We could not start checkout. Go back and try again.");
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <FunnelHeader cta={false} />
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          {error ? (
            <>
              <h1 className="text-[24px] font-semibold text-[#171717]">Checkout did not start</h1>
              <p className="mt-3 text-[14px] text-[#B91C1C]">{error}</p>
              <a href="/start-ai-business" className="mt-6 inline-block text-[#2563EB] text-[14px] font-medium">
                Back to the Launch Kit
              </a>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto animate-spin text-[#2563EB]" />
              <p className="mt-4 text-[15px] text-[#6B6B67]">Taking you to secure checkout…</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
