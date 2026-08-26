"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
      if (res.ok) {
        setName("");
        router.refresh();
      }
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/geo/competitors/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCompetitor();
            }
          }}
          placeholder="Add a competitor by name"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/30 focus:border-[#E5E5E1]"
        />
        <button
          type="button"
          onClick={addCompetitor}
          disabled={adding}
          className="shrink-0 flex items-center gap-1.5 bg-[#171717] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[#2A2A2A] disabled:opacity-60"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {competitors.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-[#171717] flex-1">{c.name}</span>
            {c.domain && <span className="text-xs text-[#A3A3A0]">{c.domain}</span>}
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0]">
              {c.source ?? "manual"}
            </span>
            <button
              type="button"
              onClick={() => remove(c.id)}
              disabled={busyId === c.id}
              aria-label="Remove competitor"
              className="text-[#A3A3A0] hover:text-[#991B1B]"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
