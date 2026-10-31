import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { cn } from "cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, retryScan, SCAN_LIST_LIMIT, type AdminScanList, type AdminScanRow, type ScanStatus } from "@/modules/admin";
import AdminEmpty from "../../_components/admin-empty";
import { SCAN_STATUS, ScanStatusBadge, TestBadge } from "../../_components/badges";
import FilterTabs from "../../_components/filter-tabs";
import RetryButton from "./retry-button";
import { formatDate, money } from "../../_components/format";
import { ModelList } from "./scan-parts";

const BASE = "/internal/admin/scans";
const FILTERS: { status: ScanStatus | undefined; label: string }[] = [
  { status: undefined, label: "All" },
  { status: "failed", label: SCAN_STATUS.failed.label },
  { status: "skipped", label: SCAN_STATUS.skipped.label },
  { status: "running", label: SCAN_STATUS.running.label },
  { status: "queued", label: SCAN_STATUS.queued.label },
  { status: "done", label: SCAN_STATUS.done.label },
];

export default function ScansList({ list, status }: { list: AdminScanList; status: ScanStatus | undefined }) {
  const { rows, counts } = list;
  const total = status ? counts[status] : counts.all;

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        label="Filter by status"
        active={status ?? "all"}
        tabs={FILTERS.map((f) => ({
          key: f.status ?? "all",
          label: f.label,
          href: f.status ? `${BASE}?status=${f.status}` : BASE,
          count: f.status ? counts[f.status] : counts.all,
          alert: f.status === "failed",
        }))}
      />

      {rows.length === 0 ? (
        <Empty status={status} />
      ) : (
        <>
          <div className="hidden rounded-md border border-border bg-surface md:block">
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow>
                  {["Business", "Status", "Models", "Credits", "Real cost", "Duration", "Started", "Error", ""].map((h, i) => (
                    <TableHead
                      key={h || i}
                      className={cn("px-2 text-[12px] font-medium text-muted-foreground", (h === "Credits" || h === "Real cost" || h === "Duration") && "text-right")}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} data-job={row.id} data-status={row.status} className={cn(row.status === "failed" && "bg-low-bg/40")}>
                    <TableCell className="px-2 max-w-[200px]">
                      <BusinessCell row={row} />
                    </TableCell>
                    <TableCell className="px-2">
                      <ScanStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="px-2">
                      <ModelList models={row.models} className="flex-nowrap" />
                    </TableCell>
                    <TableCell className="px-2 tabular text-right">{row.creditsCharged}</TableCell>
                    <TableCell className="px-2 tabular text-right">{money(row.costUsd) || <Dash />}</TableCell>
                    <TableCell className="px-2 tabular text-right">{formatDuration(row.durationMs) || <Dash />}</TableCell>
                    <TableCell className="px-2 tabular whitespace-nowrap text-muted-foreground">{formatDate(row.createdAt, true)}</TableCell>
                    <TableCell className="px-2 max-w-[240px]">
                      {row.error ? (
                        <p title={row.error} className="line-clamp-2 whitespace-normal text-low-text">
                          {row.error}
                        </p>
                      ) : (
                        <Dash />
                      )}
                    </TableCell>
                    <TableCell className="px-2 text-right">
                      {canRetry(row) && <Retry row={row} />}
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
                <ModelList models={row.models} className="text-[13px]" />
                <dl className="grid grid-cols-3 gap-2 text-[13px]">
                  <Stat label="Credits" value={String(row.creditsCharged)} />
                  <Stat label="Real cost" value={money(row.costUsd)} />
                  <Stat label="Duration" value={formatDuration(row.durationMs)} />
                </dl>
                {row.error && <p className="text-[13px] text-low-text">{row.error}</p>}
                <div className="flex items-center justify-between gap-3">
                  <span className="tabular text-[12px] text-text-hint">{formatDate(row.createdAt, true)}</span>
                  {canRetry(row) && <Retry row={row} />}
                </div>
              </li>
            ))}
          </ul>

          {total > rows.length && (
            <p className="text-[13px] text-muted-foreground">
              Showing the newest {SCAN_LIST_LIMIT} of <span className="tabular">{total}</span> scans.
            </p>
          )}
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
        className="block truncate text-[14px] font-medium text-primary hover:underline"
        title={row.businessName}
      >
        {row.businessName}
      </Link>
      <p className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
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
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
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
