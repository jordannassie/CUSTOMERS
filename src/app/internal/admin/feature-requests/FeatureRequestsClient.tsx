"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { appFetch } from "@/lib/session-expired";
import AdminEmpty from "../_components/admin-empty";
import FilterTabs, { replaceQuery } from "../_components/filter-tabs";
import AdminPageHeader from "../_components/page-header";
import { RequestRow } from "./_components/request-row";
import { FEATURE_FILTERS, STATUS_LABELS, type FeatureFilter, type FeatureRequest, type Status } from "./_components/request-parts";

const BASE = "/internal/admin/feature-requests";

export default function FeatureRequestsClient({
  requests: initial,
  filter: initialFilter,
  capped,
}: {
  requests: FeatureRequest[];
  filter: FeatureFilter;
  /** The list holds the newest `capped` requests only, so older ones are not shown. */
  capped: number | null;
}) {
  const [requests, setRequests] = useState<FeatureRequest[]>(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeatureFilter>(initialFilter);

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  // From the list as it is now, so the counts move as soon as a status is saved.
  const newCount = requests.filter((r) => r.status === "new").length;

  function selectFilter(next: string) {
    setFilter(next as FeatureFilter);
    replaceQuery("status", next === "all" ? null : next);
  }

  async function updateStatus(id: string, status: Status) {
    setUpdating(id);
    try {
      const res = await appFetch(`/api/internal/admin/feature-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch {
      toast.error("The status was not saved, so it is still what it was. Try again.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Feature requests"
        subtitle="Ideas people sent with Suggest a feature in the app. Open one to read it and set where it stands."
        actions={
          <p className="text-[13px] text-muted-foreground" data-testid="feature-request-counts">
            {requests.length} total, {newCount} new
          </p>
        }
      />

      <div className="flex flex-col gap-4">
        <FilterTabs
          label="Filter by status"
          active={filter}
          onSelect={selectFilter}
          tabs={FEATURE_FILTERS.map((s) => ({
            key: s,
            label: s === "all" ? "All" : STATUS_LABELS[s],
            href: s === "all" ? BASE : `${BASE}?status=${s}`,
            count: s === "all" ? requests.length : requests.filter((r) => r.status === s).length,
          }))}
        />

        {capped !== null && (
          <p className="text-[13px] text-muted-foreground" data-testid="feature-request-cap">
            Showing the newest {capped} requests. Older ones are not listed or counted here.
          </p>
        )}

        {filtered.length === 0 ? (
          requests.length === 0 ? (
            <AdminEmpty icon={Inbox} title="No feature requests yet">
              A request shows up here as soon as someone sends one with Suggest a feature.
            </AdminEmpty>
          ) : (
            <AdminEmpty icon={Inbox} title="No requests match this filter">
              Pick All to see every request.
            </AdminEmpty>
          )
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
    </>
  );
}
