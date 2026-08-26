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
  new:       "bg-[#172554] text-blue-300 border-blue-500/30",
  reviewing: "bg-[#1C1917] text-amber-300 border-amber-500/30",
  planned:   "bg-[#0C1A0E] text-emerald-300 border-emerald-500/30",
  shipped:   "bg-[#0F0F2D] text-violet-300 border-violet-500/30",
  declined:  "bg-[#1C0D0D] text-red-400 border-red-500/30",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = (status in STATUS_COLORS ? status : "new") as Status;
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${STATUS_COLORS[s]}`}>
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
                  ? "bg-white text-[#0F172A] border-white"
                  : "text-white/50 border-white/10 hover:border-white/30 hover:text-white/70"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-white/30 text-[14px]">No feature requests yet.</div>
      )}

      <div className="space-y-2">
        {filtered.map((req) => {
          const isExpanded = expanded === req.id;
          return (
            <div key={req.id} className="bg-[#1E293B] border border-white/8 rounded-xl overflow-hidden">
              {/* Row header */}
              <div className="grid items-center px-5 py-4 gap-3"
                style={{ gridTemplateColumns: "1fr 180px 120px 90px 28px" }}>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{req.title}</p>
                  <p className="text-[11px] text-white/30 mt-0.5 truncate">
                    {req.email}
                    {req.businessName && <> · {req.businessName}</>}
                  </p>
                </div>
                <p className="text-[11px] text-white/30 truncate hidden sm:block">
                  {req.pageContext ?? "—"}
                </p>
                <p className="text-[11px] text-white/40 hidden sm:block">{fmt(req.createdAt)}</p>
                <div>
                  <StatusBadge status={req.status} />
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : req.id)}
                  className="text-white/30 hover:text-white/70 transition-colors"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-white/8 px-5 py-4 bg-[#0F172A]/40">
                  <p className="text-[12px] text-white/50 uppercase tracking-wide font-bold mb-2">Description</p>
                  <p className="text-[13px] text-white/80 whitespace-pre-wrap mb-5 leading-relaxed">{req.description}</p>

                  <div className="flex flex-wrap gap-4 text-[11px] text-white/40 mb-5">
                    <span>User: <span className="text-white/60">{req.email}</span></span>
                    {req.businessName && <span>Business: <span className="text-white/60">{req.businessName}</span></span>}
                    {req.pageContext && <span>Page: <span className="text-white/60">{req.pageContext}</span></span>}
                    <span>Submitted: <span className="text-white/60">{fmt(req.createdAt)}</span></span>
                  </div>

                  {/* Status changer */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-white/40 mr-1">Update status:</span>
                    {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={req.status === s || updating === req.id}
                        onClick={() => updateStatus(req.id, s)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          req.status === s
                            ? "bg-white text-[#0F172A] border-white"
                            : "text-white/50 border-white/10 hover:border-white/30 hover:text-white/70"
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                    {updating === req.id && (
                      <span className="text-[11px] text-white/30 ml-1">Saving…</span>
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
