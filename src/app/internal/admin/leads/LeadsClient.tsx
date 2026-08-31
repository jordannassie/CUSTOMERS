"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  created_at: string;
  read_at: string | null;
  name: string;
  email: string;
  company: string | null;
  website: string | null;
  phone: string | null;
  topic: string;
  message: string;
  status: string;
  source: string | null;
  page_path: string | null;
}

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INTEREST_LABELS: Record<string, string> = {
  ai_visibility: "AI Visibility",
  chatgpt_ads:   "ChatGPT Ads",
  agency:        "Join as Agency",
  other:         "Other",
  product:       "Product",
  support:       "Support",
  sales:         "Sales",
  enterprise:    "Enterprise",
};

const SOURCE_LABELS: Record<string, string> = {
  contact_page: "Contact Page",
  ads_page:     "Ads Page",
  chat:         "Chat Widget",
  agency:       "Agency Page",
  other:        "Other",
};

const STATUS_OPTIONS = [
  { value: "new",       label: "New",       color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { value: "qualified", label: "Qualified", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "closed",    label: "Closed",    color: "bg-green-50 text-green-700 border-green-200" },
  { value: "in_progress", label: "In Progress", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "resolved",  label: "Resolved",  color: "bg-gray-50 text-gray-600 border-gray-200" },
];

const INTEREST_COLORS: Record<string, string> = {
  ai_visibility: "bg-blue-50 text-blue-700 border-blue-200",
  chatgpt_ads:   "bg-green-50 text-green-700 border-green-200",
  agency:        "bg-purple-50 text-purple-700 border-purple-200",
  other:         "bg-gray-50 text-gray-600 border-gray-200",
  product:       "bg-gray-50 text-gray-600 border-gray-200",
  support:       "bg-orange-50 text-orange-700 border-orange-200",
  sales:         "bg-teal-50 text-teal-700 border-teal-200",
  enterprise:    "bg-indigo-50 text-indigo-700 border-indigo-200",
};

function statusColor(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.color ?? "bg-gray-50 text-gray-600 border-gray-200";
}
function statusLabel(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ─── Icon Components ──────────────────────────────────────────────────────────

function IconInbox() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  );
}
function IconChevron({ down }: { down?: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: down ? "rotate(90deg)" : "rotate(-90deg)" }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
function IconCopy({ copied }: { copied: boolean }) {
  return copied ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
    </svg>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7280] hover:text-[#0866F5] transition-colors"
      title={copied ? "Copied!" : `Copy ${label ?? text}`}
    >
      <IconCopy copied={copied} />
      {copied ? "Copied" : label ?? "Copy"}
    </button>
  );
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────

function LeadDetail({
  lead,
  onUpdate,
  onClose,
}: {
  lead: Lead;
  onUpdate: (id: string, updates: Partial<Lead>) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function patch(payload: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/internal/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, ...payload }),
      });
      if (res.ok) {
        if (payload.mark_read)   onUpdate(lead.id, { read_at: new Date().toISOString() });
        if (payload.mark_unread) onUpdate(lead.id, { read_at: null });
        if (payload.status)      onUpdate(lead.id, { status: payload.status as string });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] shrink-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${INTEREST_COLORS[lead.topic] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
            {INTEREST_LABELS[lead.topic] ?? lead.topic}
          </span>
          {!lead.read_at && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Unread
            </span>
          )}
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F1F5F9] text-[#9CA3AF] transition-colors" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">

        {/* Contact info */}
        <div>
          <h2 className="text-[15px] font-bold text-[#111827] mb-0.5">{lead.name}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={`mailto:${lead.email}`} className="text-[13px] text-[#0866F5] hover:underline">{lead.email}</a>
            <CopyButton text={lead.email} label="Copy email" />
          </div>
          {lead.company && <p className="text-[12.5px] text-[#6B7280] mt-0.5">{lead.company}</p>}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="text-[12.5px] text-[#374151] mt-0.5 block">{lead.phone}</a>
          )}
          {lead.website && (
            <a
              href={/^https?:\/\//i.test(lead.website) ? lead.website : `https://${lead.website}`}
              target="_blank" rel="noopener noreferrer"
              className="text-[12px] text-[#0866F5] hover:underline truncate block mt-0.5"
            >
              {lead.website}
            </a>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-[11.5px]">
          <div>
            <p className="font-bold text-[#9CA3AF] uppercase tracking-wider text-[10px] mb-0.5">Received</p>
            <p className="text-[#374151]">{formatDate(lead.created_at)}</p>
          </div>
          <div>
            <p className="font-bold text-[#9CA3AF] uppercase tracking-wider text-[10px] mb-0.5">Source</p>
            <p className="text-[#374151]">{SOURCE_LABELS[lead.source ?? ""] ?? lead.source ?? "—"}</p>
          </div>
          {lead.page_path && (
            <div className="col-span-2">
              <p className="font-bold text-[#9CA3AF] uppercase tracking-wider text-[10px] mb-0.5">Page</p>
              <p className="text-[#374151] truncate">{lead.page_path}</p>
            </div>
          )}
        </div>

        {/* Message */}
        <div>
          <p className="font-bold text-[#9CA3AF] uppercase tracking-wider text-[10px] mb-1.5">Message</p>
          <p className="text-[13px] text-[#374151] whitespace-pre-wrap leading-relaxed bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl px-4 py-3">
            {lead.message}
          </p>
        </div>

        {/* Status */}
        <div>
          <p className="font-bold text-[#9CA3AF] uppercase tracking-wider text-[10px] mb-2">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                disabled={saving || lead.status === opt.value}
                onClick={() => patch({ status: opt.value })}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                  lead.status === opt.value
                    ? opt.color + " ring-2 ring-offset-1 ring-current"
                    : "bg-white border-[#E2E8F0] text-[#9CA3AF] hover:border-[#CBD5E1] hover:text-[#374151]"
                } disabled:opacity-60`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <a
            href={`mailto:${lead.email}?subject=Re: your Customers.Direct inquiry`}
            className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-[#0866F5] border border-[#0866F5]/30 bg-[#EFF6FF] hover:bg-[#DBEAFE] px-4 py-2.5 rounded-xl transition-colors"
          >
            Reply by email
          </a>
          <button
            onClick={() => lead.read_at ? patch({ mark_unread: true }) : patch({ mark_read: true })}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#6B7280] border border-[#E2E8F0] hover:bg-[#F8FAFD] px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {lead.read_at ? "Mark as unread" : "Mark as read"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadsClient() {
  const [leads,      setLeads]      = useState<Lead[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [selected,   setSelected]   = useState<Lead | null>(null);

  // Filters
  const [search,   setSearch]   = useState("");
  const [interest, setInterest] = useState("");
  const [source,   setSource]   = useState("");
  const [status,   setStatus]   = useState("");
  const [unread,   setUnread]   = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLeads = useCallback(async (opts: {
    page?: number; search?: string; interest?: string; source?: string; status?: string; unread?: boolean;
  } = {}) => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({
      page:     String(opts.page     ?? page),
      search:   opts.search          ?? search,
      interest: opts.interest        ?? interest,
      source:   opts.source          ?? source,
      status:   opts.status          ?? status,
      unread:   (opts.unread ?? unread) ? "1" : "0",
    });
    try {
      const res = await fetch(`/api/internal/admin/leads?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data: LeadsResponse = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
      setPages(data.pages);
      setPage(data.page);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [page, search, interest, source, status, unread]);

  // Initial load
  useEffect(() => { fetchLeads(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLeads({ search: val, page: 1 });
    }, 350);
  }

  function applyFilter(key: "interest" | "source" | "status", val: string) {
    const next = { interest, source, status, [key]: val };
    if (key === "interest") setInterest(val);
    if (key === "source")   setSource(val);
    if (key === "status")   setStatus(val);
    setPage(1);
    fetchLeads({ ...next, page: 1 });
  }

  function toggleUnread() {
    const next = !unread;
    setUnread(next);
    setPage(1);
    fetchLeads({ unread: next, page: 1 });
  }

  function goToPage(p: number) {
    setPage(p);
    fetchLeads({ page: p });
  }

  // Open a lead and mark it read automatically
  async function openLead(lead: Lead) {
    setSelected(lead);
    if (!lead.read_at) {
      try {
        const res = await fetch("/api/internal/admin/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: lead.id, mark_read: true }),
        });
        if (res.ok) {
          setLeads((prev) =>
            prev.map((l) => l.id === lead.id ? { ...l, read_at: new Date().toISOString() } : l)
          );
          setSelected((prev) =>
            prev?.id === lead.id ? { ...prev, read_at: new Date().toISOString() } : prev
          );
        }
      } catch { /* ignore */ }
    }
  }

  function updateLead(id: string, updates: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
    setSelected((prev) => prev?.id === id ? { ...prev, ...updates } as Lead : prev);
  }

  const selectClass =
    "border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[12.5px] text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-[#0866F5]/20 focus:border-[#0866F5]";

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-[#9CA3AF]"><IconInbox /></span>
            <h1 className="text-[17px] font-bold text-[#111827]">Leads</h1>
            {total > 0 && (
              <span className="text-[11px] font-semibold text-[#6B7280] bg-[#F1F5F9] border border-[#E2E8F0] px-2 py-0.5 rounded-full">
                {total.toLocaleString()} total
              </span>
            )}
          </div>
          <button
            onClick={() => fetchLeads()}
            disabled={loading}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] border border-[#E2E8F0] hover:bg-[#F8FAFD] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <IconRefresh />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
        <input
          ref={searchRef}
          type="search"
          placeholder="Search name, email, company…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[12.5px] text-[#374151] bg-white w-56 focus:outline-none focus:ring-2 focus:ring-[#0866F5]/20 focus:border-[#0866F5]"
        />
        <select value={interest} onChange={(e) => applyFilter("interest", e.target.value)} className={selectClass}>
          <option value="">All interests</option>
          {Object.entries(INTEREST_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => applyFilter("source", e.target.value)} className={selectClass}>
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => applyFilter("status", e.target.value)} className={selectClass}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={toggleUnread}
          className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            unread
              ? "bg-[#EFF6FF] text-[#0866F5] border-[#BFDBFE]"
              : "bg-white text-[#6B7280] border-[#E2E8F0] hover:bg-[#F8FAFD]"
          }`}
        >
          Unread only
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Lead list */}
        <div className={`flex flex-col overflow-y-auto border-r border-[#E2E8F0] ${selected ? "w-80 shrink-0" : "flex-1"}`}>
          {loading && (
            <div className="flex-1 flex items-center justify-center py-20 text-[13px] text-[#9CA3AF]">
              Loading leads…
            </div>
          )}

          {!loading && loadError && (
            <div className="m-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-[13px] font-semibold text-red-700">Failed to load leads</p>
              <p className="text-[12px] text-red-600 mt-0.5">{loadError}</p>
              <button
                onClick={() => fetchLeads()}
                className="mt-2 text-[12px] font-semibold text-red-700 underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !loadError && leads.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-10 h-10 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-3 text-[#9CA3AF]">
                <IconInbox />
              </div>
              <p className="text-[13.5px] font-semibold text-[#374151]">No leads found</p>
              <p className="text-[12px] text-[#9CA3AF] mt-1">
                {search || interest || source || status || unread
                  ? "Try adjusting your filters."
                  : "Contact submissions will appear here."}
              </p>
            </div>
          )}

          {!loading && !loadError && leads.length > 0 && (
            <>
              <div className="flex flex-col divide-y divide-[#F1F5F9]">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-[#F8FAFD] transition-colors ${
                      selected?.id === lead.id ? "bg-[#EFF6FF]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {!lead.read_at && (
                          <span className="w-2 h-2 rounded-full bg-[#0866F5] shrink-0 mt-1" aria-label="Unread" />
                        )}
                        <div className="min-w-0">
                          <p className={`text-[13px] truncate ${lead.read_at ? "text-[#374151]" : "font-bold text-[#111827]"}`}>
                            {lead.name}
                          </p>
                          <p className="text-[11.5px] text-[#9CA3AF] truncate">{lead.email}</p>
                          {lead.company && (
                            <p className="text-[11px] text-[#9CA3AF] truncate">{lead.company}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide ${INTEREST_COLORS[lead.topic] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          {INTEREST_LABELS[lead.topic] ?? lead.topic}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]">
                          {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${statusColor(lead.status)}`}>
                          {statusLabel(lead.status)}
                        </span>
                      </div>
                    </div>
                    {!selected && (
                      <p className="text-[11.5px] text-[#9CA3AF] mt-1.5 line-clamp-1 pl-4">{lead.message}</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 px-4 py-4 border-t border-[#F1F5F9]">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || loading}
                    className="px-3 py-1.5 text-[12px] font-semibold border border-[#E2E8F0] rounded-lg disabled:opacity-40 hover:bg-[#F8FAFD] transition-colors"
                  >
                    <IconChevron />
                  </button>
                  <span className="text-[12px] text-[#6B7280] font-medium">
                    Page {page} of {pages}
                  </span>
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= pages || loading}
                    className="px-3 py-1.5 text-[12px] font-semibold border border-[#E2E8F0] rounded-lg disabled:opacity-40 hover:bg-[#F8FAFD] transition-colors"
                  >
                    <IconChevron down />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <LeadDetail
              lead={selected}
              onUpdate={updateLead}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
