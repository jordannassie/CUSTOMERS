"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import type { Business } from "@/types/geo";

export default function BusinessSettingsForm({ business }: { business: Business }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: business.name,
    industry: business.industry ?? "",
    description: business.description ?? "",
    primary_city: business.primary_city ?? "",
    primary_region: business.primary_region ?? "",
    primary_country: business.primary_country ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/geo/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <FormField label="Business name">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/30 focus:border-[#E5E5E1]"
        />
      </FormField>
      <FormField label="Industry">
        <input
          value={form.industry}
          onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/30 focus:border-[#E5E5E1]"
        />
      </FormField>
      <FormField label="Description">
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/30 focus:border-[#E5E5E1] resize-none"
        />
      </FormField>
      <div className="grid grid-cols-3 gap-4">
        <FormField label="City">
          <input
            value={form.primary_city}
            onChange={(e) => setForm((f) => ({ ...f, primary_city: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/30 focus:border-[#E5E5E1]"
          />
        </FormField>
        <FormField label="Region">
          <input
            value={form.primary_region}
            onChange={(e) => setForm((f) => ({ ...f, primary_region: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/30 focus:border-[#E5E5E1]"
          />
        </FormField>
        <FormField label="Country">
          <input
            value={form.primary_country}
            onChange={(e) => setForm((f) => ({ ...f, primary_country: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]/30 focus:border-[#E5E5E1]"
          />
        </FormField>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="self-start flex items-center gap-2 bg-[#171717] text-white font-bold px-6 py-2.5 rounded-full hover:bg-[#2A2A2A] transition-colors text-sm disabled:opacity-60 mt-2"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
        {saved ? "Saved" : "Save Changes"}
      </button>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#777773] uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
