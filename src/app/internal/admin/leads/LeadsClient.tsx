"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LEADS_CHANGED } from "../_components/admin-nav";
import AdminPageHeader from "../_components/page-header";
import { LeadDetail } from "./_components/lead-detail";
import { LeadListEmpty, LeadListError, LeadNotFound, LeadPagination, LeadRows } from "./_components/lead-list";
import { LeadsFilters, type FilterKey } from "./_components/leads-filters";
import { isFiltered, leadIdFromParams, viewFromParams, viewQuery, type LeadsView } from "./_components/lead-query";
import { filterOptions, type Lead, type LeadsResponse, type OldValuesInUse } from "./_components/lead-types";
import { useLeadsList, useOpenLead } from "./_components/use-leads";

export default function LeadsClient({
  admins,
  initialView,
  initialList,
  initialLead,
  old,
}: {
  admins: string[];
  initialView: LeadsView;
  initialList: LeadsResponse | null;
  initialLead: Lead | null;
  old: OldValuesInUse;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const view = useMemo(() => viewFromParams(params), [params]);
  const leadId = leadIdFromParams(params);

  const { list, error, loading, refresh, patchLead } = useLeadsList(view, leadId, initialList, initialView);
  const inList = leadId ? list?.leads.find((l) => l.id === leadId) : undefined;
  const { selected, notFound, patchOpen } = useOpenLead(leadId, inList, initialLead, patchLead);

  // Unsaved internal notes, per lead, so opening another lead or closing this one never loses one (admin audit).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const unsaved = Object.keys(drafts).length > 0;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  function setDraft(id: string, text: string | null) {
    setDrafts((prev) => {
      const next = { ...prev };
      if (text === null) delete next[id];
      else next[id] = text;
      return next;
    });
  }

  // Filters and paging add a history entry, so Back returns to the list before; typing a search replaces it.
  function go(next: LeadsView, lead: string | null, replace = false) {
    const url = `${pathname}${viewQuery(next, lead)}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }

  // The search box keeps what is typed and follows the address when Back changes it.
  const [searchText, setSearchText] = useState(view.search);
  const [searchFrom, setSearchFrom] = useState(view.search);
  if (view.search !== searchFrom) {
    setSearchFrom(view.search);
    setSearchText(view.search);
  }
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current);
  }, []);

  function handleSearch(text: string) {
    setSearchText(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const search = text.trim().slice(0, 200);
      setSearchFrom(search);
      go({ ...view, search, page: 1 }, leadId, true);
    }, 350);
  }

  function applyFilter(key: FilterKey, value: string) {
    go({ ...view, [key]: key === "unread" ? value === "1" : value, page: 1 }, leadId);
  }

  function updateLead(id: string, updates: Partial<Lead>) {
    if ("read_at" in updates) window.dispatchEvent(new Event(LEADS_CHANGED));
    patchLead(id, updates);
    patchOpen(id, updates);
  }

  const options = filterOptions(old);
  const total = list?.total ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-[calc(1200px*var(--px,1))] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <AdminPageHeader
        title={
          <>
            Leads
            {total > 0 && <Badge variant="secondary">{total.toLocaleString("en-US")} total</Badge>}
          </>
        }
        subtitle={
          <>
            Messages from the contact page, the chat widget, the agency page and paid AI video ad briefs. A lead is New
            until someone opens it, and Contacted once you mark it as replied. The number in the menu counts unread
            leads, the ones nobody has opened yet.
          </>
        }
        actions={
          <Button type="button" variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw aria-hidden className={cn("size-4", loading && "motion-safe:animate-spin")} />
            Refresh
          </Button>
        }
      />

      <LeadsFilters view={view} search={searchText} admins={admins} options={options} onSearch={handleSearch} onFilter={applyFilter} />

      <div className="flex min-h-[calc(480px*var(--px,1))] overflow-hidden rounded-md border border-border bg-surface">
        <div
          aria-busy={loading || undefined}
          className={cn(
            "flex-col overflow-y-auto",
            leadId ? "hidden border-r border-border md:flex md:w-80 md:shrink-0" : "flex flex-1",
          )}
        >
          {error ? (
            <LeadListError message={error} onRetry={refresh} />
          ) : !list || (loading && list.leads.length === 0) ? (
            <div className="flex flex-1 items-center justify-center py-20 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
              Loading leads…
            </div>
          ) : list.leads.length === 0 ? (
            <LeadListEmpty filtered={isFiltered(view)} />
          ) : (
            <div className={cn("flex flex-col transition-opacity", loading && "opacity-60")}>
              <LeadRows
                leads={list.leads}
                selectedId={leadId ?? undefined}
                compact={Boolean(leadId)}
                unsaved={drafts}
                onOpen={(lead) => go(view, lead.id)}
              />
              <LeadPagination page={list.page} pages={list.pages} loading={loading} onGo={(page) => go({ ...view, page }, leadId)} />
            </div>
          )}
        </div>

        {leadId && (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
            {selected ? (
              <LeadDetail
                lead={selected}
                admins={admins}
                draft={drafts[selected.id]}
                onDraft={(text) => setDraft(selected.id, text)}
                onUpdate={updateLead}
                onClose={() => go(view, null)}
              />
            ) : notFound ? (
              <LeadNotFound onClose={() => go(view, null)} />
            ) : (
              <div className="flex flex-1 items-center justify-center py-20 text-[length:calc(13px*var(--px,1))] text-muted-foreground">
                Loading the lead…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
