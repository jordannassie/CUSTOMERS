"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { cn } from "cn";
import { appFetch } from "@/lib/session-expired";
import { RequestRow } from "./_components/request-row";
import { STATUS_LABELS, type FeatureRequest, type Status } from "./_components/request-parts";

const FILTERS = ["all", "new", "reviewing", "planned", "shipped", "declined"] as const;

export default function FeatureRequestsClient({ requests: initial }: { requests: FeatureRequest[] }) {
  const [requests, setRequests] = useState<FeatureRequest[]>(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  async function updateStatus(id: string, status: Status) {
    setUpdating(id);
    try {
      const res = await appFetch(`/api/internal/admin/feature-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filter by status">
        <ul className="flex w-fit max-w-full flex-wrap gap-1 rounded-md border border-border bg-muted p-1">
          {FILTERS.map((s) => {
            const active = filter === s;
            const count = s === "all" ? requests.length : requests.filter((r) => r.status === s).length;
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(s)}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s === "all" ? "All" : STATUS_LABELS[s]}
                  <span className="tabular-nums text-[12px] text-text-hint">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-6 py-12 text-center">
          <Inbox aria-hidden className="size-6 text-text-hint" />
          <p className="text-[15px] font-medium">No feature requests yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
          {filtered.map((req) => (
            <RequestRow
              key={req.id}
              req={req}
              expanded={expanded === req.id}
              saving={updating === req.id}
              onToggle={() => setExpanded(expanded === req.id ? null : req.id)}
              onStatus={(s) => updateStatus(req.id, s)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
