"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appFetch } from "@/lib/session-expired";
import AdminEmpty from "../_components/admin-empty";
import FilterTabs, { replaceQuery } from "../_components/filter-tabs";
import AdminPageHeader from "../_components/page-header";
import { RequestRow } from "./_components/request-row";
import { FEATURE_FILTERS, STATUS_LABELS, matchesSearch, type FeatureFilter, type FeatureRequest, type Status } from "./_components/request-parts";

const BASE = "/internal/admin/feature-requests";

export default function FeatureRequestsClient({
  requests: initial,
  filter: initialFilter,
  search: initialSearch,
  capped,
}: {
  requests: FeatureRequest[];
  filter: FeatureFilter;
  /** ?q= from the address. */
  search: string;
  /** The list holds the newest `capped` requests only, so older ones are not shown. */
  capped: number | null;
}) {
  const [requests, setRequests] = useState<FeatureRequest[]>(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeatureFilter>(initialFilter);
  const [search, setSearch] = useState(initialSearch);

  // The tab counts follow the search, so they always add up to what the list can show.
  const found = requests.filter((r) => matchesSearch(r, search));
  const filtered = filter === "all" ? found : found.filter((r) => r.status === filter);

  function searchFor(text: string) {
    setSearch(text);
    replaceQuery("q", text.trim() || null);
  }

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
      />

      <div className="flex flex-col gap-4">
        <div className="flex w-full min-w-0 flex-col gap-1 sm:w-72">
          <Label htmlFor="feature-search" className="text-[length:calc(13px*var(--px,1))]">Search</Label>
          <Input
            id="feature-search"
            type="search"
            value={search}
            maxLength={200}
            placeholder="Search title, text, email or business"
            onChange={(e) => searchFor(e.target.value)}
          />
        </div>

        <FilterTabs
          label="Filter by status"
          active={filter}
          onSelect={selectFilter}
          tabs={FEATURE_FILTERS.map((s) => ({
            key: s,
            label: s === "all" ? "All" : STATUS_LABELS[s],
            href: s === "all" ? BASE : `${BASE}?status=${s}`,
            count: s === "all" ? found.length : found.filter((r) => r.status === s).length,
          }))}
        />

        {capped !== null && (
          <p className="text-[length:calc(13px*var(--px,1))] text-muted-foreground" data-testid="feature-request-cap">
            Showing the newest {capped} requests. Older ones are not listed or counted here.
          </p>
        )}

        {filtered.length === 0 ? (
          requests.length === 0 ? (
            <AdminEmpty icon={Inbox} title="No feature requests yet">
              A request shows up here as soon as someone sends one with Suggest a feature.
            </AdminEmpty>
          ) : (
            <AdminEmpty icon={Inbox} title="No requests match">
              {search.trim() ? "Clear the search or pick All to see every request." : "Pick All to see every request."}
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
