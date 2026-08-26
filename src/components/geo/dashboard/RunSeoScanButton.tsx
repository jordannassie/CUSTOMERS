"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

/**
 * Mirrors RunScanButton.tsx's pattern for the AI visibility scan. Calling
 * /api/seo/run without `force` respects the SEO provider's cost-control
 * cooldown (src/lib/seo/usage.ts) — clicking this repeatedly on already-fresh
 * data reuses stored data rather than re-purchasing it from DataForSEO.
 */
export default function RunSeoScanButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seo/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "SEO analysis failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "SEO analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        className="flex items-center gap-2 bg-[#0F172A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#1e293b] transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        {loading ? "Analyzing…" : "Run SEO Scan"}
      </button>
      {error && <p className="text-xs text-[#DC2626] max-w-[260px] text-right">{error}</p>}
    </div>
  );
}
