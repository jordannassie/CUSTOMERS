"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "called", label: "Called" },
  { value: "left_voicemail", label: "Left Voicemail" },
  { value: "followed_up", label: "Followed Up" },
  { value: "interested", label: "Interested" },
  { value: "closed", label: "Closed" },
  { value: "not_interested", label: "Not Interested" },
] as const;

type LeadStatus = (typeof STATUS_OPTIONS)[number]["value"];

interface CallBarLead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  source: string | null;
  status: string;
  notes: string | null;
  business_type?: string | null;
  goal?: string | null;
  call_bar_business_phone?: string | null;
  call_bar_text?: string | null;
  call_bar_bg_color?: string | null;
  call_bar_text_color?: string | null;
  referrer_url?: string | null;
}

interface CallBarDetails {
  businessPhone: string;
  text: string;
  backgroundColor: string;
  textColor: string;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseCallBarDetails(lead: CallBarLead): CallBarDetails {
  let customization: Record<string, unknown> = {};

  if (lead.goal) {
    try {
      const parsed: unknown = JSON.parse(lead.goal);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        customization = parsed as Record<string, unknown>;
      }
    } catch {
      // Older non-Call-Bar leads may contain plain-text goals.
    }
  }

  return {
    businessPhone:
      stringValue(lead.call_bar_business_phone) || stringValue(lead.business_type),
    text:
      stringValue(lead.call_bar_text) ||
      stringValue(customization.call_bar_text) ||
      stringValue(customization.callBarText) ||
      stringValue(customization.text),
    backgroundColor:
      stringValue(lead.call_bar_bg_color) ||
      stringValue(customization.call_bar_bg_color) ||
      stringValue(customization.callBarBgColor) ||
      stringValue(customization.backgroundColor),
    textColor:
      stringValue(lead.call_bar_text_color) ||
      stringValue(customization.call_bar_text_color) ||
      stringValue(customization.callBarTextColor) ||
      stringValue(customization.textColor),
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sourceLabel(source: string | null): string {
  if (!source) return "Call Bar";
  return source
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusSelect({
  lead,
  disabled,
  onChange,
}: {
  lead: CallBarLead;
  disabled: boolean;
  onChange: (status: LeadStatus) => void;
}) {
  return (
    <select
      value={lead.status}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as LeadStatus)}
      aria-label={`Status for ${lead.full_name}`}
      className="w-full min-w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 disabled:cursor-wait disabled:opacity-60"
    >
      {!STATUS_OPTIONS.some((option) => option.value === lead.status) && (
        <option value={lead.status}>{statusLabel(lead.status)}</option>
      )}
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function CallBarPreview({ details }: { details: CallBarDetails }) {
  if (!details.text) return <span className="text-gray-400">—</span>;

  return (
    <div
      className="max-w-72 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold shadow-sm"
      style={{
        backgroundColor: details.backgroundColor || "#2563EB",
        color: details.textColor || "#FFFFFF",
      }}
    >
      {details.text}
    </div>
  );
}

function NotesEditor({
  lead,
  value,
  saving,
  saved,
  compact = false,
  onChange,
  onSave,
}: {
  lead: CallBarLead;
  value: string;
  saving: boolean;
  saved: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className={compact ? "min-w-64" : "w-full"}>
      <textarea
        value={value}
        maxLength={5000}
        rows={compact ? 2 : 3}
        placeholder="Add private notes…"
        aria-label={`Notes for ${lead.full_name}`}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-gray-400 focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="rounded-full bg-[#7C3AED] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#6D28D9] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Notes"}
        </button>
        {saved && <span className="text-xs font-semibold text-green-600">Saved</span>}
      </div>
    </div>
  );
}

export default function CallBarLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<CallBarLead[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState<Record<string, boolean>>({});
  const [notesSaving, setNotesSaving] = useState<Record<string, boolean>>({});
  const [notesSaved, setNotesSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/leads?source=call_bar");
      if (response.status === 401) {
        router.push("/admin");
        return;
      }
      if (!response.ok) throw new Error("Could not load Call Bar leads.");

      const data = (await response.json()) as { leads?: CallBarLead[] };
      const fetchedLeads = data.leads ?? [];
      setLeads(fetchedLeads);
      setNotes((current) => {
        const next = { ...current };
        fetchedLeads.forEach((lead) => {
          next[lead.id] = lead.notes ?? "";
        });
        return next;
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Could not load Call Bar leads.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLeads();
  }, [fetchLeads]);

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin");
    } finally {
      setLogoutLoading(false);
    }
  }

  async function updateStatus(lead: CallBarLead, status: LeadStatus) {
    const previousStatus = lead.status;
    setStatusSaving((current) => ({ ...current, [lead.id]: true }));
    setLeads((current) =>
      current.map((item) => (item.id === lead.id ? { ...item, status } : item)),
    );

    try {
      const response = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.status === 401) {
        router.push("/admin");
        return;
      }
      if (!response.ok) throw new Error("Could not update status.");

      const data = (await response.json()) as { lead?: CallBarLead };
      if (data.lead) {
        setLeads((current) =>
          current.map((item) => (item.id === lead.id ? { ...item, ...data.lead } : item)),
        );
      }
      setError("");
    } catch (updateError) {
      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id ? { ...item, status: previousStatus } : item,
        ),
      );
      setError(updateError instanceof Error ? updateError.message : "Could not update status.");
    } finally {
      setStatusSaving((current) => ({ ...current, [lead.id]: false }));
    }
  }

  async function saveNotes(lead: CallBarLead) {
    const value = notes[lead.id] ?? "";
    setNotesSaving((current) => ({ ...current, [lead.id]: true }));
    setNotesSaved((current) => ({ ...current, [lead.id]: false }));

    try {
      const response = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      if (response.status === 401) {
        router.push("/admin");
        return;
      }
      if (!response.ok) throw new Error("Could not save notes.");

      const data = (await response.json()) as { lead?: CallBarLead };
      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id ? { ...item, notes: data.lead?.notes ?? value } : item,
        ),
      );
      setNotesSaved((current) => ({ ...current, [lead.id]: true }));
      setError("");
      window.setTimeout(() => {
        setNotesSaved((current) => ({ ...current, [lead.id]: false }));
      }, 2500);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save notes.");
    } finally {
      setNotesSaving((current) => ({ ...current, [lead.id]: false }));
    }
  }

  return (
    <main className="min-h-screen bg-[#EFF6FF]">
      <div className="border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-lg font-black italic text-[#0F172A]">Customers.Direct</span>
            <h1 className="text-base font-bold text-[#64748B]">Call Bar Leads</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2 sm:gap-3" aria-label="Admin navigation">
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[#334155] transition hover:border-[#2563EB] hover:text-[#2563EB] sm:px-4"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/prospecting"
              className="rounded-full bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] sm:px-4"
            >
              Prospecting
            </Link>
            <button
              type="button"
              onClick={() => void fetchLeads()}
              disabled={loading}
              className="rounded-full border border-[#2563EB] px-3 py-2 text-sm font-semibold text-[#2563EB] transition hover:bg-[#EFF6FF] disabled:opacity-50 sm:px-4"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={logoutLoading}
              className="rounded-full bg-[#0F172A] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1E293B] disabled:opacity-50 sm:px-4"
            >
              {logoutLoading ? "Logging out…" : "Logout"}
            </button>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-8">
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center font-medium text-[#64748B]">Loading Call Bar leads…</div>
        ) : leads.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white py-20 text-center font-medium text-[#64748B] shadow-sm">
            No Call Bar leads yet.
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm font-semibold text-[#64748B]">
              {leads.length} {leads.length === 1 ? "lead" : "leads"}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
              <table className="w-full min-w-[1680px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[
                      "Date",
                      "Name",
                      "Email",
                      "Submitter Phone",
                      "Business Phone",
                      "Call Bar Text",
                      "Source",
                      "Status",
                      "Notes",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const details = parseCallBarDetails(lead);
                    return (
                      <tr key={lead.id} className="border-b border-gray-50 align-top hover:bg-gray-50/70">
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-[#64748B]">
                          {formatDate(lead.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#0F172A]">
                          {lead.full_name || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {lead.email ? (
                            <a className="text-[#2563EB] hover:underline" href={`mailto:${lead.email}`}>
                              {lead.email}
                            </a>
                          ) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {lead.phone ? (
                            <a className="text-[#2563EB] hover:underline" href={`tel:${lead.phone}`}>
                              {lead.phone}
                            </a>
                          ) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {details.businessPhone ? (
                            <a className="text-[#2563EB] hover:underline" href={`tel:${details.businessPhone}`}>
                              {details.businessPhone}
                            </a>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-4"><CallBarPreview details={details} /></td>
                        <td className="px-4 py-4">
                          {lead.referrer_url ? (
                            <a
                              href={lead.referrer_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-[#2563EB] hover:underline"
                            >
                              {sourceLabel(lead.source)}
                            </a>
                          ) : (
                            <span className="font-semibold text-[#475569]">{sourceLabel(lead.source)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <StatusSelect
                            lead={lead}
                            disabled={statusSaving[lead.id] ?? false}
                            onChange={(status) => void updateStatus(lead, status)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <NotesEditor
                            lead={lead}
                            value={notes[lead.id] ?? ""}
                            saving={notesSaving[lead.id] ?? false}
                            saved={notesSaved[lead.id] ?? false}
                            compact
                            onChange={(value) =>
                              setNotes((current) => ({ ...current, [lead.id]: value }))
                            }
                            onSave={() => void saveNotes(lead)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 md:hidden">
              {leads.map((lead) => {
                const details = parseCallBarDetails(lead);
                return (
                  <article key={lead.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate font-bold text-[#0F172A]">{lead.full_name || "Unnamed lead"}</h2>
                        <p className="mt-1 text-xs text-[#64748B]">{formatDate(lead.created_at)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#2563EB]">
                        {sourceLabel(lead.source)}
                      </span>
                    </div>

                    <dl className="mb-4 grid gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Email</dt>
                        <dd className="mt-1 break-all">
                          {lead.email ? <a href={`mailto:${lead.email}`} className="text-[#2563EB]">{lead.email}</a> : "—"}
                        </dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Submitter Phone</dt>
                          <dd className="mt-1">
                            {lead.phone ? <a href={`tel:${lead.phone}`} className="text-[#2563EB]">{lead.phone}</a> : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Business Phone</dt>
                          <dd className="mt-1">
                            {details.businessPhone ? (
                              <a href={`tel:${details.businessPhone}`} className="text-[#2563EB]">{details.businessPhone}</a>
                            ) : "—"}
                          </dd>
                        </div>
                      </div>
                      <div>
                        <dt className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Call Bar Text</dt>
                        <dd><CallBarPreview details={details} /></dd>
                      </div>
                      {lead.referrer_url && (
                        <div>
                          <dt className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Source Page</dt>
                          <dd className="mt-1 truncate">
                            <a href={lead.referrer_url} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:underline">
                              {lead.referrer_url}
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>

                    <div className="mb-4 border-t border-gray-100 pt-4">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
                        Status
                      </label>
                      <StatusSelect
                        lead={lead}
                        disabled={statusSaving[lead.id] ?? false}
                        onChange={(status) => void updateStatus(lead, status)}
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
                        Notes
                      </label>
                      <NotesEditor
                        lead={lead}
                        value={notes[lead.id] ?? ""}
                        saving={notesSaving[lead.id] ?? false}
                        saved={notesSaved[lead.id] ?? false}
                        onChange={(value) =>
                          setNotes((current) => ({ ...current, [lead.id]: value }))
                        }
                        onSave={() => void saveNotes(lead)}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
