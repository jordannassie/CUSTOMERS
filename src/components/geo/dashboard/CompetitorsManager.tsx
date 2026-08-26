"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Globe } from "lucide-react";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { DomainFavicon } from "@/components/DomainFavicon";
import type { BusinessCompetitor } from "@/types/geo";

export default function CompetitorsManager({
  businessId,
  competitors,
}: {
  businessId: string;
  competitors: BusinessCompetitor[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function addCompetitor() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res = await fetch("/api/geo/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          competitors: [{ name: trimmed, source: "manual" }],
        }),
      });
      if (res.ok) { setName(""); router.refresh(); }
    } finally { setAdding(false); }
  }

  async function remove(id: string) {
    setBusyId(id);
    setConfirmId(null);
    try {
      await fetch(`/api/geo/competitors/${id}`, { method: "DELETE" });
      router.refresh();
    } finally { setBusyId(null); }
  }

  return (
    <div>
      {/* Add form */}
      <div className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }}
          placeholder="Add competitor by name (e.g. Salesforce)"
          className="flex-1 border border-[#E5E5E1] rounded-lg px-4 py-2.5 text-[13px] text-[#171717] placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/20 bg-white"
        />
        <button
          type="button"
          onClick={addCompetitor}
          disabled={adding}
          className="shrink-0 flex items-center gap-1.5 bg-[#171717] text-white rounded-lg px-4 py-2.5 text-[13px] font-semibold hover:bg-[#2A2A2A] disabled:opacity-50 active:scale-[0.97] transition-all"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>

      {/* Table */}
      {competitors.length === 0 ? (
        <div className="text-center py-10 text-[13px] text-[#A3A3A0]">
          No competitors added yet. Add your first competitor above.
        </div>
      ) : (
        <div className="border border-[#E5E5E1] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid items-center px-4 py-2.5 border-b border-[#EEEEEA] bg-[#FAFAF8]"
            style={{ gridTemplateColumns: "28px 1fr 110px 90px 44px" }}>
            {["#", "Competitor", "Domain", "Source", ""].map(h => (
              <span key={h} className="text-[10px] font-semibold text-[#A3A3A0] uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-[#EEEEEA]">
            {competitors.map((c, i) => (
              <div key={c.id}
                className="grid items-center px-4 py-3 hover:bg-[#F5F5F2] transition-colors group"
                style={{ gridTemplateColumns: "28px 1fr 110px 90px 44px" }}>

                {/* Rank */}
                <span className="text-[12px] text-[#A3A3A0] font-semibold tabular-nums">{i + 1}</span>

                {/* Avatar + name */}
                <span className="flex items-center gap-2.5 min-w-0">
                  <CompetitorAvatar name={c.name} size={24} />
                  <span className="text-[13px] font-semibold text-[#171717] truncate">{c.name}</span>
                </span>

                {/* Domain with favicon */}
                {c.domain ? (
                  <span className="flex items-center gap-1.5 min-w-0">
                    <DomainFavicon domain={c.domain} size={12} />
                    <span className="text-[11px] text-[#777773] truncate">{c.domain}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-[#A3A3A0]">
                    <Globe size={11} />
                    <span>not set</span>
                  </span>
                )}

                {/* Source badge */}
                <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0F0EC] text-[#777773] w-fit">
                  {c.source ?? "manual"}
                </span>

                {/* Delete */}
                <div className="flex items-center justify-end">
                  {confirmId === c.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => remove(c.id)}
                        disabled={busyId === c.id}
                        className="text-[10px] font-semibold text-[#DC2626] hover:underline"
                      >
                        {busyId === c.id ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
                      </button>
                      <button onClick={() => setConfirmId(null)}
                        className="text-[10px] text-[#A3A3A0] hover:text-[#777773]">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(c.id)}
                      aria-label={`Remove ${c.name}`}
                      className="text-[#D4D4CF] hover:text-[#DC2626] transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
