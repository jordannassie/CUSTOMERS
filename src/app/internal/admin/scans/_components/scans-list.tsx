import Link from "next/link";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, retryScan, SCAN_LIST_LIMIT, type AdminScanList, type AdminScanRow, type ScanStatus } from "@/modules/admin";
import RetryButton from "./retry-button";
import { ModelList, STATUS, StatusBadge, usd, when } from "./scan-parts";

const BASE = "/internal/admin/scans";
const FILTERS: { status: ScanStatus | undefined; label: string }[] = [
  { status: undefined, label: "All" },
  { status: "failed", label: STATUS.failed.label },
  { status: "running", label: STATUS.running.label },
  { status: "queued", label: STATUS.queued.label },
  { status: "done", label: STATUS.done.label },
];

export default function ScansList({ list, status }: { list: AdminScanList; status: ScanStatus | undefined }) {
  const { rows, counts } = list;
  const total = status ? counts[status] : counts.all;

  return (
    <div className="flex flex-col gap-4">
      {/* Wraps on phones instead of scrolling, so no filter is ever hidden off the edge. */}
      <nav aria-label="Filter by status">
        <ul className="flex w-fit max-w-full flex-wrap gap-1 rounded-md border border-border bg-muted p-1">
          {FILTERS.map((f) => {
            const active = f.status === status;
            const count = f.status ? counts[f.status] : counts.all;
            return (
              <li key={f.label}>
                <Link
                  href={f.status ? `${BASE}?status=${f.status}` : BASE}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "tabular text-[12px]",
                      f.status === "failed" && count > 0 ? "font-semibold text-low-text" : "text-text-hint",
                    )}
                  >
                    {count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

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
                      className={cn("text-[12px] font-medium text-muted-foreground", (h === "Credits" || h === "Real cost" || h === "Duration") && "text-right")}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} data-job={row.id} data-status={row.status} className={cn(row.status === "failed" && "bg-low-bg/40")}>
                    <TableCell className="max-w-[200px]">
                      <BusinessCell row={row} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <ModelList models={row.models} className="flex-nowrap" />
                    </TableCell>
                    <TableCell className="tabular text-right">{row.creditsCharged}</TableCell>
                    <TableCell className="tabular text-right">{usd(row.costUsd) || <Dash />}</TableCell>
                    <TableCell className="tabular text-right">{formatDuration(row.durationMs) || <Dash />}</TableCell>
                    <TableCell className="tabular whitespace-nowrap text-muted-foreground">{when(row.createdAt)}</TableCell>
                    <TableCell className="max-w-[240px]">
                      {row.error ? (
                        <p title={row.error} className="line-clamp-2 whitespace-normal text-low-text">
                          {row.error}
                        </p>
                      ) : (
                        <Dash />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "failed" && <RetryButton jobId={row.id} businessName={row.businessName} retry={retryScan} />}
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
                  <StatusBadge status={row.status} />
                </div>
                <ModelList models={row.models} className="text-[13px]" />
                <dl className="grid grid-cols-3 gap-2 text-[13px]">
                  <Stat label="Credits" value={String(row.creditsCharged)} />
                  <Stat label="Real cost" value={usd(row.costUsd)} />
                  <Stat label="Duration" value={formatDuration(row.durationMs)} />
                </dl>
                {row.error && <p className="text-[13px] text-low-text">{row.error}</p>}
                <div className="flex items-center justify-between gap-3">
                  <span className="tabular text-[12px] text-text-hint">{when(row.createdAt)} UTC</span>
                  {row.status === "failed" && <RetryButton jobId={row.id} businessName={row.businessName} retry={retryScan} />}
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

function BusinessCell({ row }: { row: AdminScanRow }) {
  return (
    <div className="min-w-0">
      <Link
        href={`/internal/admin/businesses/${row.businessId}`}
        className="block truncate text-[14px] font-medium hover:text-primary hover:underline"
      >
        {row.businessName}
      </Link>
      <p className="flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
        <span className="truncate">{row.agencyName || "No agency"}</span>
        {row.isTest && <Badge variant="outline">Test</Badge>}
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
  return (
    <div className="rounded-md border border-dashed border-border bg-surface px-6 py-12 text-center">
      <p className="text-[15px] font-medium">{status === "failed" ? "No failed scans" : "No scans here yet"}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {status === "failed"
          ? "Every scan finished or is still on its way."
          : "Scans show up here as soon as a business is queued for one."}
      </p>
    </div>
  );
}
