"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { TrackedPrompt } from "@/types/geo";

export default function PromptsManager({ businessId, prompts }: { businessId: string; prompts: TrackedPrompt[] }) {
  const router = useRouter();
  const [newPrompt, setNewPrompt] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function addPrompt() {
    const text = newPrompt.trim();
    if (!text) return;
    setAdding(true);
    try {
      const res = await fetch("/api/geo/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, prompts: [{ prompt: text, category: "custom" }] }),
      });
      if (res.ok) {
        setNewPrompt("");
        router.refresh();
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(prompt: TrackedPrompt) {
    setBusyId(prompt.id);
    try {
      await fetch(`/api/geo/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !prompt.active }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(prompt: TrackedPrompt) {
    setBusyId(prompt.id);
    try {
      await fetch(`/api/geo/prompts/${prompt.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <input
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addPrompt();
            }
          }}
          placeholder="Add a custom buyer-intent prompt to track"
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/30 focus:border-[#E5E5E1]"
        />
        <button
          type="button"
          onClick={addPrompt}
          disabled={adding}
          className="shrink-0 flex items-center gap-1.5 bg-[#171717] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[#2A2A2A] disabled:opacity-60"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {prompts.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3">
            <label className="flex items-center gap-2 shrink-0">
              <input
                type="checkbox"
                checked={p.active}
                onChange={() => toggleActive(p)}
                disabled={busyId === p.id}
                className="accent-[#2563EB]"
              />
            </label>
            <span className={`text-sm flex-1 ${p.active ? "text-[#171717]" : "text-[#A3A3A0] line-through"}`}>
              {p.prompt}
            </span>
            {p.category && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A0] shrink-0">
                {p.category}
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(p)}
              disabled={busyId === p.id}
              aria-label="Delete prompt"
              className="shrink-0 text-[#A3A3A0] hover:text-[#991B1B]"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
