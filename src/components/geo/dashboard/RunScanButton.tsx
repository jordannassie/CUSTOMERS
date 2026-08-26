"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

export default function RunScanButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const runRes = await fetch("/api/geo/visibility/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId }),
      });
      const runData = await runRes.json();
      if (!runRes.ok) throw new Error(runData.error ?? "Scan failed.");

      if (runData.result?.promptsSucceeded > 0) {
        await fetch("/api/geo/opportunities/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ business_id: businessId }),
        });
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        className="flex items-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1d4ed8] transition-colors disabled:opacity-60 whitespace-nowrap"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {loading ? "Running scan…" : "Run New Scan"}
      </button>
      {error && <p className="text-xs text-[#DC2626] max-w-[240px] text-right">{error}</p>}
    </div>
  );
}
