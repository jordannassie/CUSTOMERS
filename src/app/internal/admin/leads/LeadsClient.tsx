"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appFetch } from "@/lib/session-expired";
import { LEADS_CHANGED } from "../_components/admin-nav";
import AdminPageHeader from "../_components/page-header";
import { LeadDetail } from "./_components/lead-detail";
import { LeadListEmpty, LeadListError, LeadPagination, LeadRows } from "./_components/lead-list";
import { LeadsFilters } from "./_components/leads-filters";
import type { Lead, LeadsQuery, LeadsResponse } from "./_components/lead-types";

async function requestLeads(q: LeadsQuery): Promise<LeadsResponse> {
  const params = new URLSearchParams({
    page: String(q.page),
    search: q.search,
    interest: q.interest,
    source: q.source,
    status: q.status,
    unread: q.unread ? "1" : "0",
  });
  const res = await appFetch(`/api/internal/admin/leads?${params}`);
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? "Your admin session has ended. Log in again to see the leads."
        : "Something went wrong on our side. Try again in a moment.",
    );
  }
  return res.json();
}

export default function LeadsClient({ admins }: { admins: string[] }) {
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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showLeads(data: LeadsResponse) {
    setLeads(data.leads);
    setTotal(data.total);
    setPages(data.pages);
    setPage(data.page);
    setLoading(false);
  }

  function showLoadError(err: unknown) {
    setLoadError(err instanceof Error && !/fetch|network/i.test(err.message) ? err.message : "Check your internet connection and try again.");
    setLoading(false);
  }

  // Only the newest request is shown: a slow answer for an older filter or search never replaces a newer one.
  const latestRequest = useRef(0);
  function load(query: LeadsQuery) {
    const id = ++latestRequest.current;
    requestLeads(query).then(
      (data) => id === latestRequest.current && showLeads(data),
      (err) => id === latestRequest.current && showLoadError(err),
    );
  }

  function fetchLeads(opts: Partial<LeadsQuery> = {}) {
    setLoading(true);
    setLoadError(null);
    load({ page, search, interest, source, status, unread, ...opts });
  }

  // Initial load
  useEffect(() => {
    const id = ++latestRequest.current;
    requestLeads({ page: 1, search: "", interest: "", source: "", status: "", unread: false }).then(
      (data) => id === latestRequest.current && showLeads(data),
      (err) => id === latestRequest.current && showLoadError(err),
    );
  }, []);

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
        const res = await appFetch("/api/internal/admin/leads", {
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
          window.dispatchEvent(new Event(LEADS_CHANGED));
        }
      } catch { /* ignore */ }
    }
  }

  function updateLead(id: string, updates: Partial<Lead>) {
    if ("read_at" in updates) window.dispatchEvent(new Event(LEADS_CHANGED));
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
    setSelected((prev) => prev?.id === id ? { ...prev, ...updates } as Lead : prev);
  }

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <AdminPageHeader
        title={
          <>
            Leads
            {total > 0 && <Badge variant="secondary">{total.toLocaleString("en-US")} total</Badge>}
          </>
        }
        subtitle="Messages people sent from the contact page, the chat widget and the agency page. Open one to reply or change its status."
        actions={
          <Button type="button" variant="outline" onClick={() => fetchLeads()} disabled={loading}>
            <RefreshCw aria-hidden className={cn("size-4", loading && "motion-safe:animate-spin")} />
            Refresh
          </Button>
        }
      />

      <LeadsFilters
        search={search}
        interest={interest}
        source={source}
        status={status}
        unread={unread}
        onSearch={handleSearchChange}
        onFilter={applyFilter}
        onToggleUnread={toggleUnread}
      />

      <div className="flex min-h-[calc(480px*var(--px,1))] overflow-hidden rounded-md border border-border bg-surface">
        <div
          className={cn(
            "flex-col overflow-y-auto",
            selected ? "hidden border-r border-border md:flex md:w-80 md:shrink-0" : "flex flex-1",
          )}
        >
          {loading && (
            <div className="flex flex-1 items-center justify-center py-20 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
              Loading leads…
            </div>
          )}
          {!loading && loadError && <LeadListError message={loadError} onRetry={() => fetchLeads()} />}
          {!loading && !loadError && leads.length === 0 && (
            <LeadListEmpty filtered={Boolean(search || interest || source || status || unread)} />
          )}
          {!loading && !loadError && leads.length > 0 && (
            <>
              <LeadRows leads={leads} selectedId={selected?.id} compact={Boolean(selected)} onOpen={openLead} />
              <LeadPagination page={page} pages={pages} loading={loading} onGo={goToPage} />
            </>
          )}
        </div>

        {selected && (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
            <LeadDetail lead={selected} admins={admins} onUpdate={updateLead} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
