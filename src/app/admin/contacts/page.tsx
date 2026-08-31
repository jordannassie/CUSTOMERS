"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Contact {
  id:         string;
  created_at: string;
  name:       string;
  email:      string;
  company:    string | null;
  website:    string | null;
  phone:      string | null;
  topic:      string;
  message:    string;
  status:     string;
  source:     string | null;
  page_path:  string | null;
}

const INTEREST_LABELS: Record<string, string> = {
  ai_visibility: "AI Visibility",
  chatgpt_ads:   "ChatGPT Ads",
  agency:        "Join as Agency",
  other:         "Other",
  // Legacy values
  product:       "Product Question",
  support:       "Account / Support",
  sales:         "Sales",
  enterprise:    "Enterprise",
};

const SOURCE_LABELS: Record<string, string> = {
  contact_page: "Contact page",
  ads_page:     "Ads page",
  chat:         "Chat widget",
  agency:       "Agency page",
  other:        "Other",
};

const TOPIC_COLORS: Record<string, string> = {
  ai_visibility: "bg-[#EFF6FF] text-[#0866F5] border-[#BFDBFE]",
  chatgpt_ads:   "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  agency:        "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
  other:         "bg-[#F8FAFD] text-[#6B7280] border-[#E2E8F0]",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contacts");
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      setContacts(data.contacts ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void fetchContacts(); }, [fetchContacts]);

  return (
    <main className="min-h-screen bg-[#EFF6FF]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-black italic text-lg text-[#0F172A]">Customers.Direct</span>
            <h1 className="text-base font-bold text-[#64748B]">Contact Submissions</h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/admin/dashboard"
              className="text-sm font-semibold text-[#0866F5] border border-[#0866F5] px-4 py-2 rounded-full hover:bg-[#EFF6FF] transition-colors"
            >
              ← All Leads
            </Link>
            <button
              onClick={fetchContacts}
              disabled={loading}
              className="text-sm font-semibold text-[#2563EB] border border-[#2563EB] px-4 py-2 rounded-full hover:bg-[#EFF6FF] transition-colors disabled:opacity-50"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {loading && (
          <div className="text-center text-[#64748B] py-20">Loading contact submissions…</div>
        )}

        {!loading && contacts.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-[14px] font-semibold text-[#374151] mb-1">No contact submissions yet</p>
            <p className="text-[12.5px] text-[#9CA3AF]">
              Submissions from /contact, /ads, and the chat widget will appear here.
            </p>
          </div>
        )}

        {!loading && contacts.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[12px] font-semibold text-[#64748B] mb-2">
              {contacts.length} submission{contacts.length !== 1 ? "s" : ""}
            </p>
            {contacts.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
              >
                {/* Summary row */}
                <button
                  className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-[#F8FAFD] transition-colors"
                  onClick={() => setExpanded((prev) => (prev === c.id ? null : c.id))}
                  aria-expanded={expanded === c.id}
                >
                  {/* Topic badge */}
                  <span
                    className={`shrink-0 mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${
                      TOPIC_COLORS[c.topic] ?? "bg-[#F8FAFD] text-[#6B7280] border-[#E2E8F0]"
                    }`}
                  >
                    {INTEREST_LABELS[c.topic] ?? c.topic}
                  </span>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold text-[#111827] truncate">{c.name}</p>
                    <p className="text-[12px] text-[#6B7280] truncate">{c.email}</p>
                    {c.company && (
                      <p className="text-[11.5px] text-[#9CA3AF] truncate">{c.company}</p>
                    )}
                  </div>

                  {/* Source + date */}
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-[#9CA3AF]">{formatDate(c.created_at)}</p>
                    {c.source && (
                      <span className="text-[10px] font-semibold text-[#9CA3AF] bg-[#F8FAFD] border border-[#E2E8F0] px-1.5 py-0.5 rounded mt-1 inline-block">
                        {SOURCE_LABELS[c.source] ?? c.source}
                      </span>
                    )}
                  </div>

                  {/* Chevron */}
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="#9CA3AF"
                    className={`shrink-0 mt-1 transition-transform ${expanded === c.id ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <path d="M2 5l5 5 5-5H2z"/>
                  </svg>
                </button>

                {/* Expanded details */}
                {expanded === c.id && (
                  <div className="px-5 pb-5 border-t border-[#F1F5F9] pt-4 flex flex-col gap-4">

                    <div className="grid sm:grid-cols-2 gap-4">
                      {c.website && (
                        <div>
                          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5">Website</p>
                          <a href={/^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[12.5px] text-[#0866F5] hover:underline truncate block">
                            {c.website}
                          </a>
                        </div>
                      )}
                      {c.phone && (
                        <div>
                          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5">Phone</p>
                          <a href={`tel:${c.phone}`} className="text-[12.5px] text-[#374151]">{c.phone}</a>
                        </div>
                      )}
                      {c.page_path && (
                        <div>
                          <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-0.5">Page</p>
                          <p className="text-[12.5px] text-[#374151]">{c.page_path}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Message</p>
                      <p className="text-[12.5px] text-[#374151] whitespace-pre-wrap leading-relaxed bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl px-4 py-3">
                        {c.message}
                      </p>
                    </div>

                    {/* Quick actions */}
                    <div className="flex gap-2 flex-wrap">
                      <a
                        href={`mailto:${c.email}?subject=Re: your Customers.Direct inquiry`}
                        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0866F5] border border-[#0866F5]/30 bg-[#EFF6FF] hover:bg-[#DBEAFE] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Reply by email
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
