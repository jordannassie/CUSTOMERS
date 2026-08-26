"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Building2, Upload } from "lucide-react";
import type { Business } from "@/types/geo";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";

const INPUT_CLS =
  "w-full border border-[#E5E5E1] rounded-xl px-4 py-3 text-[13px] text-[#171717] placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/20 bg-white";

export default function BusinessSettingsForm({ business }: { business: Business }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: business.name,
    industry: business.industry ?? "",
    description: business.description ?? "",
    primary_city: business.primary_city ?? "",
    primary_region: business.primary_region ?? "",
    primary_country: business.primary_country ?? "",
    logo_url: business.logo_url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      if (field === "logo_url") setLogoPreviewError(false);
    };
  }

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
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  const showLogoPreview = form.logo_url.trim().length > 0 && !logoPreviewError;

  return (
    <form onSubmit={save} className="flex flex-col gap-5">

      {/* Logo preview + upload row */}
      <div className="flex items-start gap-5">
        {/* Preview circle */}
        <div className="shrink-0">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#E5E5E1] bg-[#F5F5F2] overflow-hidden flex items-center justify-center"
            style={{ boxShadow: showLogoPreview ? "0 2px 8px rgba(0,0,0,0.08)" : "none" }}>
            {showLogoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logo_url}
                alt={form.name}
                className="w-full h-full object-contain p-2"
                onError={() => setLogoPreviewError(true)}
              />
            ) : (
              <CompetitorAvatar name={form.name || "B"} size={48} className="rounded-xl" />
            )}
          </div>
          <p className="text-[10px] text-[#A3A3A0] text-center mt-1.5">Preview</p>
        </div>

        {/* Logo URL input */}
        <div className="flex-1 min-w-0">
          <label className="block text-[11px] font-bold text-[#777773] uppercase tracking-wider mb-2">
            Business Logo
          </label>
          <div className="relative">
            <Upload size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A0] pointer-events-none" />
            <input
              type="url"
              value={form.logo_url}
              onChange={set("logo_url")}
              placeholder="https://yoursite.com/logo.png"
              className={`${INPUT_CLS} pl-9`}
            />
          </div>
          <p className="text-[11px] text-[#A3A3A0] mt-1.5">
            Paste a direct link to your logo image (PNG, SVG, or JPG).
            {logoPreviewError && (
              <span className="text-[#DC2626] ml-1">Could not load that URL — please check the link.</span>
            )}
          </p>
        </div>
      </div>

      <div className="border-t border-[#EEEEEA]" />

      {/* Core fields */}
      <FormField label="Business name">
        <input value={form.name} onChange={set("name")} required className={INPUT_CLS} />
      </FormField>

      <FormField label="Industry">
        <input value={form.industry} onChange={set("industry")} placeholder="e.g. Church, HVAC, Law Firm" className={INPUT_CLS} />
      </FormField>

      <FormField label="Description">
        <textarea
          rows={3}
          value={form.description}
          onChange={set("description")}
          placeholder="Briefly describe your business…"
          className={`${INPUT_CLS} resize-none`}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="City">
          <input value={form.primary_city} onChange={set("primary_city")} className={INPUT_CLS} />
        </FormField>
        <FormField label="Region / State">
          <input value={form.primary_region} onChange={set("primary_region")} className={INPUT_CLS} />
        </FormField>
        <FormField label="Country">
          <input value={form.primary_country} onChange={set("primary_country")} className={INPUT_CLS} />
        </FormField>
      </div>

      {/* Domain reminder */}
      {business.domain && (
        <div className="flex items-center gap-2.5 bg-[#F5F5F2] border border-[#E5E5E1] rounded-xl px-4 py-3">
          <Building2 size={13} className="text-[#A3A3A0] shrink-0" aria-hidden="true" />
          <p className="text-[12px] text-[#777773]">
            Tracking <strong className="text-[#171717]">{business.domain}</strong> — domain changes require a new scan.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="self-start flex items-center gap-2 bg-[#171717] text-white font-bold px-6 py-2.5 rounded-full hover:bg-[#2A2A2A] transition-all text-[13px] disabled:opacity-60 active:scale-[0.97]"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
        {saved ? "Saved!" : "Save Changes"}
      </button>
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#777773] uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}
