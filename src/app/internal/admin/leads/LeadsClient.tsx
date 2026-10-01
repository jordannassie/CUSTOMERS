"use client";

import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appFetch } from "@/lib/session-expired";
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
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showLeads(data: LeadsResponse) {
    setLeads(data.leads);
    setTotal(data.total);
    setPages(data.pages);
    setPage(data.page);
    setLoading(false);
  }

  function showLoadError(err: unknown) {
    setLoadError(err instanceof Error ? err.message : "Failed to load leads.");
    setLoading(false);
  }

  function fetchLeads(opts: Partial<LeadsQuery> = {}) {
    setLoading(true);
    setLoadError(null);
    requestLeads({ page, search, interest, source, status, unread, ...opts }).then(showLeads, showLoadError);
  }

  // Initial load
  useEffect(() => {
    requestLeads({ page: 1, search: "", interest: "", source: "", status: "", unread: false })
      .then(showLeads, showLoadError);
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
        }
      } catch { /* ignore */ }
    }
  }

  function updateLead(id: string, updates: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
    setSelected((prev) => prev?.id === id ? { ...prev, ...updates } as Lead : prev);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Leads</h1>
            {total > 0 && <Badge variant="secondary">{total.toLocaleString()} total</Badge>}
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => fetchLeads()} disabled={loading}>
          <RefreshCw aria-hidden className={cn("size-4", loading && "motion-safe:animate-spin")} />
          Refresh
        </Button>
      </header>

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

      <div className="flex min-h-[480px] overflow-hidden rounded-md border border-border bg-surface">
        <div
          className={cn(
            "flex-col overflow-y-auto",
            selected ? "hidden border-r border-border md:flex md:w-80 md:shrink-0" : "flex flex-1",
          )}
        >
          {loading && (
            <div className="flex flex-1 items-center justify-center py-20 text-[13px] text-muted-foreground">
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
            <LeadDetail lead={selected} onUpdate={updateLead} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
