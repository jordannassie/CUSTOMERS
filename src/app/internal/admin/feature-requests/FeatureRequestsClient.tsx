"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Status = "new" | "reviewing" | "planned" | "shipped" | "declined";

interface FeatureRequest {
  id: string;
  userId: string;
  businessId: string | null;
  title: string;
  description: string;
  pageContext: string | null;
  status: string;
  createdAt: string;
  email: string;
  businessName: string | null;
}

const STATUS_LABELS: Record<Status, string> = {
  new:       "New",
  reviewing: "Reviewing",
  planned:   "Planned",
  shipped:   "Shipped",
  declined:  "Declined",
};

const STATUS_COLORS: Record<Status, string> = {
  new:       "bg-[#EFF6FF] text-[#0866F5] border-[#BFDBFE]",
  reviewing: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
  planned:   "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
  shipped:   "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  declined:  "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = (status in STATUS_COLORS ? status : "new") as Status;
  return (
    <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${STATUS_COLORS[s]}`}>
      {STATUS_LABELS[s]}
    </span>
  );
}

export default function FeatureRequestsClient({ requests: initial }: { requests: FeatureRequest[] }) {
  const [requests, setRequests] = useState<FeatureRequest[]>(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  async function updateStatus(id: string, status: Status) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/feature-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(["all", "new", "reviewing", "planned", "shipped", "declined"] as const).map((s) => {
          const count = s === "all" ? requests.length : requests.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                filter === s
                  ? "bg-[#0866F5] text-white border-[#0866F5]"
                  : "text-[#6B7280] border-[#E2E8F0] hover:border-[#0866F5]/40 hover:text-[#0866F5]"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[#9CA3AF] text-[13px]">
          No feature requests yet.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((req) => {
          const isExpanded = expanded === req.id;
          return (
            <div
              key={req.id}
              className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            >
              {/* Row header */}
              <div
                className="grid items-center px-5 py-4 gap-3"
                style={{ gridTemplateColumns: "1fr 180px 120px 100px 28px" }}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827] truncate">{req.title}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5 truncate">
                    {req.email}
                    {req.businessName && <> · {req.businessName}</>}
                  </p>
                </div>
                <p className="text-[11px] text-[#9CA3AF] truncate hidden sm:block">
                  {req.pageContext ?? "—"}
                </p>
                <p className="text-[11px] text-[#9CA3AF] hidden sm:block">{fmt(req.createdAt)}</p>
                <div>
                  <StatusBadge status={req.status} />
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : req.id)}
                  className="text-[#9CA3AF] hover:text-[#374151] transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-[#F1F5F9] px-5 py-4 bg-[#F8FAFD]">
                  <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-2">Description</p>
                  <p className="text-[13px] text-[#374151] whitespace-pre-wrap mb-5 leading-relaxed">{req.description}</p>

                  <div className="flex flex-wrap gap-4 text-[11px] text-[#9CA3AF] mb-5">
                    <span>User: <span className="text-[#374151] font-medium">{req.email}</span></span>
                    {req.businessName && <span>Business: <span className="text-[#374151] font-medium">{req.businessName}</span></span>}
                    {req.pageContext && <span>Page: <span className="text-[#374151] font-medium">{req.pageContext}</span></span>}
                    <span>Submitted: <span className="text-[#374151] font-medium">{fmt(req.createdAt)}</span></span>
                  </div>

                  {/* Status changer */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-[#9CA3AF] mr-1">Update status:</span>
                    {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={req.status === s || updating === req.id}
                        onClick={() => updateStatus(req.id, s)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          req.status === s
                            ? "bg-[#0866F5] text-white border-[#0866F5]"
                            : "text-[#6B7280] border-[#E2E8F0] hover:border-[#0866F5]/40 hover:text-[#0866F5]"
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                    {updating === req.id && (
                      <span className="text-[11px] text-[#9CA3AF] ml-1">Saving…</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
