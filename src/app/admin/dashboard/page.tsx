"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  business_name: string;
  website: string;
  status: string;
  notes: string | null;
  followed_up_at: string | null;
  created_at: string;
  source?: string | null;
}

type Filter = "all" | "new" | "followed_up";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  if (!url) return "#";
  return /^https?:\/\//i.test(url) ? url : "https://" + url;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ lead }: { lead: Lead }) {
  if (lead.status === "followed_up") {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Followed up
        </span>
        {lead.followed_up_at && (
          <span className="text-[10px] text-gray-400 pl-1">{formatShortDate(lead.followed_up_at)}</span>
        )}
      </div>
    );
  }
  return (
    <span className="inline-block bg-[#DBEAFE] text-[#2563EB] text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
      New
    </span>
  );
}

// ─── Notes panel (shared desktop/mobile) ──────────────────────────────────────

function NotesPanel({
  lead, text, onChange, onSave, saving, saved,
}: {
  lead: Lead;
  text: string;
  onChange: (v: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-bold text-[#7C3AED] uppercase tracking-wide">
        Private Notes — {lead.full_name}
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        maxLength={5000}
        rows={4}
        placeholder="Add private follow-up notes…"
        className="w-full border border-purple-200 rounded-xl px-4 py-3 text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 resize-none"
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onSave}
          disabled={saving}
          className="text-sm font-semibold bg-[#7C3AED] text-white px-5 py-2 rounded-full hover:bg-[#6D28D9] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Notes"}
        </button>
        {saved && (
          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Notes saved
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto">{text.length}/5000</span>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<Record<string, string>>({});
  const [notesSaving, setNotesSaving] = useState<Record<string, boolean>>({});
  const [notesSaved, setNotesSaved] = useState<Record<string, boolean>>({});
  const [statusUpdating, setStatusUpdating] = useState<Record<string, boolean>>({});

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/leads");
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      const fetched: Lead[] = (data.leads ?? []).filter(
        (lead: Lead) => lead.source !== "call_bar",
      );
      setLeads(fetched);
      setNotesText((prev) => {
        const next = { ...prev };
        fetched.forEach((l) => { if (!(l.id in next)) next[l.id] = l.notes ?? ""; });
        return next;
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchLeads(); }, [fetchLeads]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin");
    } catch { setLogoutLoading(false); }
  }

  async function deleteLead(lead: Lead) {
    if (!window.confirm(`Delete lead from ${lead.full_name}? This cannot be undone.`)) return;
    // Optimistic remove
    setLeads((ls) => ls.filter((l) => l.id !== lead.id));
    try {
      await fetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
    } catch {
      // Restore on failure
      setLeads((ls) => [...ls, lead].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    }
  }

  async function toggleFollowedUp(lead: Lead) {
    if (statusUpdating[lead.id]) return;
    const newStatus = lead.status === "followed_up" ? "new" : "followed_up";
    const prevStatus = lead.status;
    const prevDate = lead.followed_up_at;

    // Optimistic update
    setLeads((ls) => ls.map((l) =>
      l.id === lead.id
        ? { ...l, status: newStatus, followed_up_at: newStatus === "followed_up" ? new Date().toISOString() : null }
        : l
    ));
    setStatusUpdating((s) => ({ ...s, [lead.id]: true }));

    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLeads((ls) => ls.map((l) => l.id === lead.id ? { ...l, ...data.lead } : l));
    } catch {
      // Restore
      setLeads((ls) => ls.map((l) =>
        l.id === lead.id ? { ...l, status: prevStatus, followed_up_at: prevDate } : l
      ));
    } finally {
      setStatusUpdating((s) => ({ ...s, [lead.id]: false }));
    }
  }

  async function saveNotes(lead: Lead) {
    const notes = notesText[lead.id] ?? "";
    setNotesSaving((s) => ({ ...s, [lead.id]: true }));
    setNotesSaved((s) => ({ ...s, [lead.id]: false }));
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLeads((ls) => ls.map((l) => l.id === lead.id ? { ...l, notes: data.lead.notes } : l));
      setNotesSaved((s) => ({ ...s, [lead.id]: true }));
      setTimeout(() => setNotesSaved((s) => ({ ...s, [lead.id]: false })), 2500);
    } catch { /* user can retry */ }
    finally { setNotesSaving((s) => ({ ...s, [lead.id]: false })); }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const counts = {
    all: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    followed_up: leads.filter((l) => l.status === "followed_up").length,
  };

  const filtered = leads.filter((l) => {
    if (filter === "new") return l.status === "new";
    if (filter === "followed_up") return l.status === "followed_up";
    return true;
  });

  // ── UI helpers ─────────────────────────────────────────────────────────────────
  function notesButton(lead: Lead) {
    const isOpen = openNotes === lead.id;
    const hasNotes = !!lead.notes;
    return (
      <button
        onClick={() => setOpenNotes(isOpen ? null : lead.id)}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
          isOpen
            ? "bg-[#7C3AED] text-white border-[#7C3AED]"
            : hasNotes
            ? "bg-purple-50 text-[#7C3AED] border-purple-200 hover:bg-purple-100"
            : "bg-white text-[#64748B] border-gray-200 hover:border-[#7C3AED] hover:text-[#7C3AED]"
        }`}
      >
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Notes
        {hasNotes && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      </button>
    );
  }

  function followUpCheckbox(lead: Lead) {
    return (
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={lead.status === "followed_up"}
          disabled={statusUpdating[lead.id]}
          onChange={() => toggleFollowedUp(lead)}
          className="w-4 h-4 accent-[#22C55E] cursor-pointer disabled:cursor-wait"
        />
        <span className="text-xs font-medium text-[#64748B] whitespace-nowrap">Followed up</span>
      </label>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#EFF6FF]">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-black italic text-lg text-[#0F172A]">Customers.Direct</span>
            <h1 className="text-base font-bold text-[#64748B]">Strategy Call Leads</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/call-bar-leads"
              className="text-sm font-semibold text-white bg-[#7C3AED] px-4 py-2 rounded-full hover:bg-[#6D28D9] transition-colors"
            >
              Call Bar Leads
            </Link>
            <Link
              href="/admin/prospecting"
              className="text-sm font-semibold text-white bg-[#2563EB] px-4 py-2 rounded-full hover:bg-[#1d4ed8] transition-colors"
            >
              Prospecting
            </Link>
            <button
              onClick={fetchLeads} disabled={loading}
              className="text-sm font-semibold text-[#2563EB] border border-[#2563EB] px-4 py-2 rounded-full hover:bg-[#EFF6FF] transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              onClick={handleLogout} disabled={logoutLoading}
              className="text-sm font-semibold text-white bg-[#0F172A] px-4 py-2 rounded-full hover:bg-[#1e293b] transition-colors disabled:opacity-50"
            >
              {logoutLoading ? "Logging out…" : "Logout"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Filters */}
        {!loading && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {(["all", "new", "followed_up"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors flex items-center gap-2 ${
                  filter === f
                    ? "bg-[#2563EB] text-white border-[#2563EB]"
                    : "bg-white text-[#64748B] border-gray-200 hover:border-[#2563EB] hover:text-[#2563EB]"
                }`}
              >
                {f === "all" ? "All" : f === "new" ? "New" : "Followed Up"}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  filter === f ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* States */}
        {loading ? (
          <div className="text-center py-20 text-[#64748B] font-medium">Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#64748B] font-medium">
            {leads.length === 0
              ? "No leads yet. Strategy call submissions will appear here."
              : "No leads matching this filter."}
          </div>
        ) : (
          <>
            {/* ── DESKTOP TABLE ────────────────────────────────────── */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Date", "Name", "Phone", "Email", "Business", "Website", "Status", "Actions"].map((col) => (
                      <th key={col} className="text-left px-5 py-3.5 text-xs font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <React.Fragment key={lead.id}>
                      <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-[#64748B] whitespace-nowrap text-xs">{formatDate(lead.created_at)}</td>
                        <td className="px-5 py-4 font-semibold text-[#0F172A] whitespace-nowrap">{lead.full_name}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <a href={`tel:${lead.phone}`} className="text-[#2563EB] hover:underline">{lead.phone}</a>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <a href={`mailto:${lead.email}`} className="text-[#2563EB] hover:underline">{lead.email}</a>
                        </td>
                        <td className="px-5 py-4 text-[#0F172A] whitespace-nowrap">{lead.business_name}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <a href={normalizeUrl(lead.website)} target="_blank" rel="noopener noreferrer"
                            className="text-[#2563EB] hover:underline truncate max-w-[140px] block">
                            {lead.website}
                          </a>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <StatusBadge lead={lead} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            {followUpCheckbox(lead)}
                            {notesButton(lead)}
                            <button
                              onClick={() => deleteLead(lead)}
                              title="Delete lead"
                              aria-label="Delete lead"
                              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Notes expansion row */}
                      {openNotes === lead.id && (
                        <tr className="bg-purple-50/60 border-b border-purple-100">
                          <td colSpan={8} className="px-6 py-5">
                            <div className="max-w-2xl">
                              <NotesPanel
                                lead={lead}
                                text={notesText[lead.id] ?? ""}
                                onChange={(v) => setNotesText((n) => ({ ...n, [lead.id]: v }))}
                                onSave={() => saveNotes(lead)}
                                saving={notesSaving[lead.id] ?? false}
                                saved={notesSaved[lead.id] ?? false}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE CARDS ─────────────────────────────────────── */}
            <div className="md:hidden flex flex-col gap-4">
              {filtered.map((lead) => (
                <div key={lead.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="font-bold text-[#0F172A] truncate">{lead.full_name}</div>
                      <div className="text-xs text-[#64748B] truncate">{lead.business_name}</div>
                    </div>
                    <div className="shrink-0"><StatusBadge lead={lead} /></div>
                  </div>

                  <div className="text-xs text-[#64748B] mb-3">{formatDate(lead.created_at)}</div>

                  {/* Contact links */}
                  <div className="flex flex-col gap-1.5 mb-4">
                    <a href={`tel:${lead.phone}`} className="text-sm text-[#2563EB] hover:underline">{lead.phone}</a>
                    <a href={`mailto:${lead.email}`} className="text-sm text-[#2563EB] hover:underline">{lead.email}</a>
                    <a href={normalizeUrl(lead.website)} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-[#2563EB] hover:underline truncate">{lead.website}</a>
                  </div>

                  {/* Actions */}
                  <div className="border-t border-gray-100 pt-3 flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={lead.status === "followed_up"}
                        disabled={statusUpdating[lead.id]}
                        onChange={() => toggleFollowedUp(lead)}
                        className="w-5 h-5 accent-[#22C55E] cursor-pointer disabled:cursor-wait"
                      />
                      <span className="text-sm font-medium text-[#64748B]">Followed up</span>
                    </label>
                    {notesButton(lead)}
                    <button
                      onClick={() => deleteLead(lead)}
                      title="Delete lead"
                      aria-label="Delete lead"
                      className="ml-auto p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* Notes panel */}
                  {openNotes === lead.id && (
                    <div className="mt-4 pt-4 border-t border-purple-100">
                      <NotesPanel
                        lead={lead}
                        text={notesText[lead.id] ?? ""}
                        onChange={(v) => setNotesText((n) => ({ ...n, [lead.id]: v }))}
                        onSave={() => saveNotes(lead)}
                        saving={notesSaving[lead.id] ?? false}
                        saved={notesSaved[lead.id] ?? false}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
