"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPin, Phone, Save, X } from "lucide-react";
import {
  PROSPECT_STATUSES,
  type ProspectBusinessHours,
  type ProspectingFolder,
  type ProspectingLead,
} from "@/types/prospecting";

interface ProspectDrawerProps {
  prospect: ProspectingLead | null;
  folders: ProspectingFolder[];
  onClose: () => void;
  onSave: (id: string, patch: Record<string, string | null>) => Promise<void>;
  onCall: (prospect: ProspectingLead) => void;
}

type EditableFields = {
  status: string;
  folder_id: string;
  contact_name: string;
  contact_title: string;
  contact_email: string;
  contact_phone: string;
  next_follow_up_at: string;
  notes: string;
};

function valuesFromProspect(prospect: ProspectingLead): EditableFields {
  return {
    status: prospect.status,
    folder_id: prospect.folder_id ?? "",
    contact_name: prospect.contact_name ?? "",
    contact_title: prospect.contact_title ?? "",
    contact_email: prospect.contact_email ?? "",
    contact_phone: prospect.contact_phone ?? "",
    next_follow_up_at: prospect.next_follow_up_at?.slice(0, 10) ?? "",
    notes: prospect.notes ?? "",
  };
}

export default function ProspectDrawer({
  prospect,
  folders,
  onClose,
  onSave,
  onCall,
}: ProspectDrawerProps) {
  if (!prospect) return null;
  return (
    <ProspectDrawerContent
      key={prospect.id}
      prospect={prospect}
      folders={folders}
      onClose={onClose}
      onSave={onSave}
      onCall={onCall}
    />
  );
}

function ProspectDrawerContent({
  prospect,
  folders,
  onClose,
  onSave,
  onCall,
}: ProspectDrawerProps & { prospect: ProspectingLead }) {
  const [form, setForm] = useState<EditableFields>(() => valuesFromProspect(prospect));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hours, setHours] = useState<ProspectBusinessHours | null>(null);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [hoursError, setHoursError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/prospects/${prospect.id}/hours`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Business hours are unavailable.");
        return data.hours as ProspectBusinessHours;
      })
      .then((data) => {
        if (!cancelled) setHours(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setHoursError(
            error instanceof Error ? error.message : "Business hours are unavailable.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHoursLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [prospect.id]);

  function update(field: keyof EditableFields, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave(prospect.id, {
        ...form,
        folder_id: form.folder_id || null,
        next_follow_up_at: form.next_follow_up_at
          ? new Date(`${form.next_follow_up_at}T12:00:00`).toISOString()
          : null,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function phoneUrl(phone: string) {
    const digits = phone.replace(/\D/g, "");
    const internationalNumber =
      digits.length === 10 ? `+1${digits}` : `+${digits}`;
    return `tel:${internationalNumber}`;
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/20" role="dialog" aria-modal="true" aria-label={`${prospect.business_name} details`}>
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close prospect details" />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="min-w-0 pr-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#2563EB]">Prospect details</p>
            <h2 className="mt-1 truncate text-xl font-black text-slate-950">{prospect.business_name}</h2>
            <p className="mt-1 text-sm text-slate-500">{prospect.category ?? "Business"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-950" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-7 p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {prospect.phone && (
              <a href={phoneUrl(prospect.phone)} onClick={() => onCall(prospect)} className="flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
                <Phone size={15} /> {prospect.phone}
              </a>
            )}
            {prospect.website && (
              <a href={prospect.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <ExternalLink size={15} /> Website
              </a>
            )}
            {prospect.google_maps_url && (
              <a href={prospect.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                <MapPin size={15} /> Maps
              </a>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm leading-6 text-slate-600">{prospect.address ?? "No address returned"}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <span><strong className="text-slate-950">{prospect.rating ?? "—"}</strong> rating</span>
              <span><strong className="text-slate-950">{prospect.review_count ?? 0}</strong> reviews</span>
              <span><strong className="text-slate-950">{prospect.lead_score}</strong> opportunity</span>
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                Business Hours
              </h3>
              {hours?.openNow !== null && hours?.openNow !== undefined && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${hours.openNow ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {hours.openNow ? "Open now" : "Closed now"}
                </span>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              {hoursLoading ? (
                <p className="text-sm text-slate-400">Loading current hours…</p>
              ) : hoursError ? (
                <p className="text-sm text-slate-500">{hoursError}</p>
              ) : hours?.weekdayDescriptions.length ? (
                <div className="space-y-1.5">
                  {hours.weekdayDescriptions.map((description) => (
                    <p key={description} className="text-sm text-slate-600">
                      {description}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Hours were not provided by this business.</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Pipeline</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">
                Status
                <select value={form.status} onChange={(event) => update("status", event.target.value)} className={`${inputClass} mt-1`}>
                  {PROSPECT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Folder
                <select value={form.folder_id} onChange={(event) => update("folder_id", event.target.value)} className={`${inputClass} mt-1`}>
                  <option value="" disabled>Choose a Calling List</option>
                  {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                Follow-up date
                <input type="date" value={form.next_follow_up_at} onChange={(event) => update("next_follow_up_at", event.target.value)} className={`${inputClass} mt-1`} />
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["contact_name", "Name", "Owner or manager"],
                ["contact_title", "Title", "Owner"],
                ["contact_email", "Email", "name@business.com"],
                ["contact_phone", "Additional phone", "(555) 555-5555"],
              ] as const).map(([field, label, placeholder]) => (
                <label key={field} className="text-xs font-bold text-slate-600">
                  {label}
                  <input value={form[field]} onChange={(event) => update(field, event.target.value)} placeholder={placeholder} className={`${inputClass} mt-1`} />
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Notes</h3>
            <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={7} placeholder="Call outcome, objections, next step…" className={`${inputClass} resize-y`} />
          </section>

          <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-100 bg-white py-4">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
              <Save size={16} /> {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <span className="text-sm font-semibold text-emerald-600">Saved</span>}
          </div>
        </div>
      </aside>
    </div>
  );
}
