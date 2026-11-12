import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { cn } from "cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, retryScan, SCAN_PAGE_SIZE, type AdminScanList, type AdminScanRow, type ScanFilterOptions, type ScanListQuery, type ScanStatus } from "@/modules/admin";
import AdminEmpty from "../../_components/admin-empty";
import { SCAN_STATUS, ScanStatusBadge, TestBadge } from "../../_components/badges";
import FilterTabs from "../../_components/filter-tabs";
import Pagination from "../../_components/pagination";
import ScanFilters from "./scan-filters";
import { SCANS_BASE, scansHref } from "./scan-href";
import RetryButton from "./retry-button";
import { formatDate, money } from "../../_components/format";
import { ModelList } from "./scan-parts";
import ScanError from "../../_components/scan-error";

const FILTERS: { status: ScanStatus | undefined; label: string }[] = [
  { status: undefined, label: "All" },
  { status: "failed", label: SCAN_STATUS.failed.label },
  { status: "skipped", label: SCAN_STATUS.skipped.label },
  { status: "running", label: SCAN_STATUS.running.label },
  { status: "queued", label: SCAN_STATUS.queued.label },
  { status: "done", label: SCAN_STATUS.done.label },
];

export default function ScansList({ list, query, options }: { list: AdminScanList; query: ScanListQuery; options: ScanFilterOptions }) {
  const { rows, counts } = list;
  const status = query.status;
  // Every filter but the page, for the page links.
  const params = Object.fromEntries(new URL(scansHref(query), "http://x").searchParams);

  return (
    <div className="flex flex-col gap-4">
      <ScanFilters query={query} options={options} agencyName={list.agencyName} />
      <FilterTabs
        label="Filter by status"
        active={status ?? "all"}
        tabs={FILTERS.map((f) => ({
          key: f.status ?? "all",
          label: f.label,
          href: scansHref(query, { status: f.status }),
          count: f.status ? counts[f.status] : counts.all,
          alert: f.status === "failed",
        }))}
      />

      {rows.length === 0 ? (
        <Empty status={status} />
      ) : (
        <>
          <div className="hidden rounded-md border border-border bg-surface md:block">
            <Table className="text-[length:calc(13px*var(--px,1))]">
              <TableHeader>
                <TableRow>
                  {["Business", "Status", "Models", "Credits", "Real cost", "Duration", "Started", "Error"].map((h, i) => (
                    <TableHead
                      key={h || i}
                      className={cn("px-2 text-[length:calc(12px*var(--px,1))] font-medium text-muted-foreground", (h === "Credits" || h === "Real cost" || h === "Duration") && "text-right")}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} data-job={row.id} data-status={row.status}>
                    <TableCell className="px-2">
                      {/* A width on the content, not the cell: an auto-width table ignores max-width on cells. */}
                      <div className="w-[calc(180px*var(--px,1))]">
                        <BusinessCell row={row} />
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <ScanStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="px-2">
                      <ModelList models={row.models} className="w-[calc(150px*var(--px,1))]" />
                    </TableCell>
                    <TableCell className="px-2 tabular text-right">{row.creditsCharged}</TableCell>
                    <TableCell className="px-2 tabular text-right">{money(row.costUsd) || <Dash />}</TableCell>
                    <TableCell className="px-2 tabular text-right">{formatDuration(row.durationMs) || <Dash />}</TableCell>
                    <TableCell className="px-2 tabular whitespace-normal text-muted-foreground">
                      <span className="block w-[calc(110px*var(--px,1))]">{formatDate(row.createdAt, true)}</span>
                    </TableCell>
                    {/* Retry sits under the reason it fixes, so the table needs no extra column and fits at 1440px. */}
                    <TableCell className="px-2">
                      <div className="flex w-[calc(250px*var(--px,1))] flex-col items-start gap-2">
                        {row.error ? <ScanError error={row.error} clamp /> : <Dash />}
                        {canRetry(row) && <Retry row={row} />}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface md:hidden">
            {rows.map((row) => (
              <li key={row.id} data-job={row.id} data-status={row.status} className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <BusinessCell row={row} />
                  <ScanStatusBadge status={row.status} />
                </div>
                <ModelList models={row.models} className="text-[length:calc(13px*var(--px,1))]" />
                <dl className="grid grid-cols-3 gap-2 text-[length:calc(13px*var(--px,1))]">
                  <Stat label="Credits" value={String(row.creditsCharged)} />
                  <Stat label="Real cost" value={money(row.costUsd)} />
                  <Stat label="Duration" value={formatDuration(row.durationMs)} />
                </dl>
                {row.error && <ScanError error={row.error} className="text-[length:calc(13px*var(--px,1))]" />}
                <div className="flex items-center justify-between gap-3">
                  <span className="tabular text-[length:calc(12px*var(--px,1))] text-text-hint">{formatDate(row.createdAt, true)}</span>
                  {canRetry(row) && <Retry row={row} />}
                </div>
              </li>
            ))}
          </ul>

          <Pagination base={SCANS_BASE} params={params} page={list.page} pages={list.pages} total={list.total} pageSize={SCAN_PAGE_SIZE} noun="scans" />
        </>
      )}
    </div>
  );
}

const canRetry = (row: AdminScanRow) => row.status === "failed" || row.status === "skipped";

function Retry({ row }: { row: AdminScanRow }) {
  return <RetryButton jobId={row.id} businessName={row.businessName} credits={row.scanCredits} agencyName={row.agencyName} retry={retryScan} />;
}

function BusinessCell({ row }: { row: AdminScanRow }) {
  return (
    <div className="min-w-0">
      <Link
        href={`/internal/admin/businesses/${row.businessId}`}
        className="block truncate text-[length:calc(14px*var(--px,1))] font-medium text-primary hover:underline"
        title={row.businessName}
      >
        {row.businessName}
      </Link>
      <p className="flex items-center gap-1.5 truncate text-[length:calc(12px*var(--px,1))] text-muted-foreground">
        {row.agencyId ? (
          <Link href={`/internal/admin/agencies/${row.agencyId}`} className="truncate hover:text-primary hover:underline" title={row.agencyName}>
            {row.agencyName}
          </Link>
        ) : (
          <span className="truncate">No agency</span>
        )}
        {row.isTest && <TestBadge />}
        {row.attempts > 1 && <span className="tabular whitespace-nowrap">{row.attempts} tries</span>}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[length:calc(12px*var(--px,1))] text-muted-foreground">{label}</dt>
      <dd className="tabular font-medium">{value || <Dash />}</dd>
    </div>
  );
}

function Dash() {
  return (
    <span aria-label="None" className="text-text-hint">
      -
    </span>
  );
}

function Empty({ status }: { status: ScanStatus | undefined }) {
  if (!status) {
    return (
      <AdminEmpty icon={ScanSearch} title="No scans yet">
        Scans show up here as soon as a business is queued for one.
      </AdminEmpty>
    );
  }
  return (
    <AdminEmpty icon={ScanSearch} title={`No ${SCAN_STATUS[status].label.toLowerCase()} scans`}>
      {status === "failed" ? "Every scan finished or is still on its way." : "Nothing matches this filter. Pick All to see every scan."}
    </AdminEmpty>
  );
}
