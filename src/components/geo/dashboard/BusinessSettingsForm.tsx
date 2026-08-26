"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Building2, Camera, X } from "lucide-react";
import type { Business } from "@/types/geo";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";

const INPUT_CLS =
  "w-full border border-[#E5E5E1] rounded-xl px-4 py-3 text-[13px] text-[#171717] placeholder:text-[#A3A3A0] focus:outline-none focus:ring-2 focus:ring-[#171717]/20 bg-white";

export default function BusinessSettingsForm({ business }: { business: Business }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: business.name,
    domain: business.domain ?? "",
    industry: business.industry ?? "",
    description: business.description ?? "",
    primary_city: business.primary_city ?? "",
    primary_region: business.primary_region ?? "",
    primary_country: business.primary_country ?? "",
  });
  const domainChanged = form.domain.trim() !== (business.domain ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("businessId", business.id);
      const res = await fetch("/api/geo/businesses/logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { setUploadError(json.error ?? "Upload failed."); return; }
      setLogoUrl(json.url);
      router.refresh();
    } catch {
      setUploadError("Upload failed — please try again.");
    } finally {
      setUploading(false);
      // reset file input so same file can be re-picked
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);
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
      } else {
        const json = await res.json().catch(() => ({}));
        setSaveError(json.error ?? "Could not save business settings. Please try again.");
      }
    } catch {
      setSaveError("Connection error — please check your internet and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">

      {/* Logo upload */}
      <div className="flex items-start gap-5">
        {/* Clickable preview */}
        <div className="shrink-0 relative">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="group relative w-20 h-20 rounded-2xl border-2 border-[#E5E5E1] bg-[#F5F5F2] overflow-hidden flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#171717]/20 hover:border-[#171717] transition-colors"
            aria-label="Upload business logo"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={form.name} className="w-full h-full object-contain p-1.5" />
            ) : (
              <CompetitorAvatar name={form.name || "B"} size={48} className="rounded-xl" />
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              {uploading ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : (
                <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
              )}
            </div>
          </button>
          {/* Remove logo */}
          {logoUrl && !uploading && (
            <button
              type="button"
              onClick={async () => {
                setLogoUrl(null);
                await fetch(`/api/geo/businesses/${business.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ logo_url: "" }),
                });
                router.refresh();
              }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#171717] border-2 border-white flex items-center justify-center hover:bg-[#DC2626] transition-colors"
              aria-label="Remove logo"
            >
              <X size={9} className="text-white" />
            </button>
          )}
          <p className="text-[10px] text-[#A3A3A0] text-center mt-1.5">
            {uploading ? "Uploading…" : "Click to change"}
          </p>
        </div>

        {/* Instructions */}
        <div className="flex-1 min-w-0 pt-1">
          <label className="block text-[11px] font-bold text-[#777773] uppercase tracking-wider mb-2">
            Business Logo
          </label>
          <p className="text-[12px] text-[#A3A3A0] leading-snug mb-3">
            Click the preview to upload your logo. PNG, JPG, SVG, or WebP — max 2 MB.
            {" "}Square or wide logos work best.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 text-[12px] font-semibold bg-[#F5F5F2] border border-[#E5E5E1] text-[#171717] px-3 py-1.5 rounded-lg hover:bg-[#EFEFEB] hover:border-[#D4D4CF] transition-colors disabled:opacity-50"
          >
            <Camera size={12} aria-hidden="true" />
            {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
          </button>
          {uploadError && (
            <p className="text-[11px] text-[#DC2626] mt-2">{uploadError}</p>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />
      </div>

      <div className="border-t border-[#EEEEEA]" />

      {/* Core fields */}
      <FormField label="Business name">
        <input value={form.name} onChange={set("name")} required className={INPUT_CLS} />
      </FormField>

      <FormField label="Website domain">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] text-[#A3A3A0] pointer-events-none select-none">
            https://
          </span>
          <input
            value={form.domain}
            onChange={set("domain")}
            placeholder="yourbusiness.com"
            className={`${INPUT_CLS} pl-[72px]`}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {domainChanged ? (
          /* Warn when domain has been edited */
          <div className="flex items-start gap-2.5 mt-2.5 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl px-4 py-3">
            <svg width="15" height="15" viewBox="0 0 16 16" className="text-[#C2410C] shrink-0 mt-0.5" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
            </svg>
            <div>
              <p className="text-[12px] font-semibold text-[#92400E] mb-1">New scan required after saving</p>
              <p className="text-[11.5px] text-[#92400E]/80 leading-snug">
                AI visibility data, citation sources, and prompt results are tied to the domain.
                After saving, go to the Overview and click <strong>Run Scan</strong> to rebuild
                visibility data for the new domain.
              </p>
              <p className="text-[11.5px] text-[#92400E]/70 mt-1.5 leading-snug">
                Your competitors and prompt list will carry over — review and update them if needed.
              </p>
            </div>
          </div>
        ) : (
          /* Quiet tip when domain is unchanged */
          <p className="text-[11px] text-[#A3A3A0] mt-1.5 leading-snug">
            Only update this if your website moved to a new address. For a completely different
            business,{" "}
            <a href="/dashboard/add-business" className="underline hover:no-underline text-[#777773]">
              add it as a new business
            </a>{" "}
            instead — it gets its own fresh scan, competitors, and data.
          </p>
        )}
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

      {/* Currently tracked domain — link to visit */}
      {business.domain && !domainChanged && (
        <div className="flex items-center gap-2.5 bg-[#F5F5F2] border border-[#E5E5E1] rounded-xl px-4 py-3">
          <Building2 size={13} className="text-[#A3A3A0] shrink-0" aria-hidden="true" />
          <p className="text-[12px] text-[#777773]">
            Currently tracking{" "}
            <a
              href={`https://${business.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#171717] underline underline-offset-2 hover:no-underline"
            >
              {business.domain} ↗
            </a>
          </p>
        </div>
      )}

      {saveError && (
        <div className="flex items-start gap-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 16 16" className="text-[#DC2626] shrink-0 mt-0.5" fill="currentColor" aria-hidden="true">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
          </svg>
          <p className="text-[12px] text-[#B91C1C]">{saveError}</p>
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
