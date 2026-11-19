"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import type { ScanFilterOptions, ScanListQuery } from "@/modules/admin";
import DateRangePicker from "./date-range-picker";
import { CLEAR_FILTERS, scansHref } from "./scan-href";

const ALL = "all";
const SELECT_CLASS = "h-9 rounded-md text-[length:calc(13px*var(--px,1))] sm:w-[calc(220px*var(--px,1))] md:text-[length:calc(13px*var(--px,1))]";

/**
 * Agency, business and date filters that apply the moment they change, no Apply button (admin review 2026-11-12).
 * Each change goes into the address, so a filtered list can be shared and Back works. The business list follows the
 * chosen agency, and choosing another agency clears the business. Real or test agencies only (from the Overview
 * links) shows as a chip that removes it.
 */
export default function ScanFilters({
  query,
  options,
  agencyName,
  business,
}: {
  query: ScanListQuery;
  options: ScanFilterOptions;
  agencyName: string | null;
  business: { name: string; deleted: boolean } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (change: Parameters<typeof scansHref>[1]) => startTransition(() => router.push(scansHref(query, change), { scroll: false }));

  const agencies = options.agencies.map((a) => ({ value: a.id, label: a.label }));
  // An agency opened from its own page may be missing from the list (deleted, or past the list limit): keep it choosable.
  if (query.agency && !agencies.some((a) => a.value === query.agency)) agencies.unshift({ value: query.agency, label: agencyName ?? "This agency" });
  const businesses = options.businesses.filter((b) => !query.agency || b.agencyId === query.agency).map((b) => ({ value: b.id, label: b.label }));
  // A deleted business is not in the list: keep its real name, marked as deleted.
  if (query.business && !businesses.some((b) => b.value === query.business)) {
    const label = business ? `${business.name}${business.deleted ? " (deleted)" : ""}` : "Unknown business";
    businesses.unshift({ value: query.business, label });
  }
  const active = query.from || query.to || query.agency || query.business || query.test !== "all";

  return (
    <div className="flex flex-col gap-2 text-[length:calc(13px*var(--px,1))] sm:flex-row sm:flex-wrap sm:items-center" role="group" aria-label="Scan filters">
      <label htmlFor="scans-agency" className="sr-only">
        Agency
      </label>
      <Select
        id="scans-agency"
        value={query.agency ?? ALL}
        onValueChange={(v) => go({ agency: v === ALL ? undefined : v, business: undefined })}
        options={[{ value: ALL, label: "All agencies" }, ...agencies]}
        placeholder="All agencies"
        className={SELECT_CLASS}
      />
      <label htmlFor="scans-business" className="sr-only">
        Business
      </label>
      <Select
        id="scans-business"
        value={query.business ?? ALL}
        onValueChange={(v) => go({ business: v === ALL ? undefined : v })}
        options={[{ value: ALL, label: "All businesses" }, ...businesses]}
        placeholder="All businesses"
        className={SELECT_CLASS}
      />
      <DateRangePicker value={{ from: query.from, to: query.to }} onChange={(r) => go({ from: r.from, to: r.to })} />
      {query.test !== "all" && (
        <span className="inline-flex h-9 items-center gap-1 self-start rounded-md border border-border bg-muted pr-1 pl-3 sm:self-auto">
          {query.test === "real" ? "Real agencies only" : "Test agencies only"}
          <button
            type="button"
            onClick={() => go({ test: "all" })}
            aria-label={`Remove the filter: ${query.test === "real" ? "real agencies only" : "test agencies only"}`}
            className="grid size-7 place-items-center rounded-sm text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X aria-hidden className="size-4" />
          </button>
        </span>
      )}
      {active && (
        <button
          type="button"
          onClick={() => go(CLEAR_FILTERS)}
          className="h-9 self-start px-1 font-medium text-primary hover:underline sm:self-auto"
        >
          Clear filters
        </button>
      )}
      {pending && (
        <span className="flex h-9 items-center gap-1.5 text-muted-foreground" role="status">
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Updating
        </span>
      )}
    </div>
  );
}
