import { cn } from "cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SCAN_PAGE_SIZE, type AdminScanList, type AdminScanRow, type ScanFilterOptions, type ScanListQuery, type ScanStatus } from "@/modules/admin";
import { SCAN_STATUS, ScanStatusBadge } from "../../_components/badges";
import FilterTabs from "../../_components/filter-tabs";
import Pagination from "../../_components/pagination";
import { formatDate } from "../../_components/format";
import ScanFilters from "./scan-filters";
import { SCANS_BASE, scansHref } from "./scan-href";
import { costCell, durationParts, durationText } from "./scan-cells";
import { BusinessCell, Cost, Dash, ModelList, Outcome, ScansEmpty } from "./scan-parts";

const FILTERS: { status: ScanStatus | undefined; label: string }[] = [
  { status: undefined, label: "All" },
  { status: "failed", label: SCAN_STATUS.failed.label },
  { status: "skipped", label: SCAN_STATUS.skipped.label },
  { status: "running", label: SCAN_STATUS.running.label },
  { status: "queued", label: SCAN_STATUS.queued.label },
  { status: "done", label: SCAN_STATUS.done.label },
];

const RIGHT = new Set(["Credits", "Real cost", "Duration"]);

export default function ScansList({ list, query, options }: { list: AdminScanList; query: ScanListQuery; options: ScanFilterOptions }) {
  const { rows, counts } = list;
  const status = query.status;
  // Every filter but the page, for the page links.
  const params = Object.fromEntries(new URL(scansHref(query), "http://x").searchParams);

  return (
    <div className="flex flex-col gap-4">
      <ScanFilters query={query} options={options} agencyName={list.agencyName} business={list.business} />
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
        <ScansEmpty query={query} />
      ) : (
        <>
          <div className="hidden rounded-md border border-border bg-surface md:block">
            <Table className="text-[length:calc(13px*var(--px,1))]">
              <TableHeader>
                <TableRow>
                  {["Business", "Status", "Models", "Credits", "Real cost", "Duration", "Started", "Error"].map((h) => (
                    <TableHead key={h} className={cn("px-2 text-[length:calc(12px*var(--px,1))] font-medium text-muted-foreground", RIGHT.has(h) && "text-right")}>
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
                      <div className="w-[calc(150px*var(--px,1))]">
                        <BusinessCell row={row} />
                      </div>
                    </TableCell>
                    <TableCell className="px-2">
                      <ScanStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="px-2">
                      {/* One model per line: three side by side pushed the table past 1440px (admin audit 2026-11-12). */}
                      <ModelList models={row.models} className="w-[calc(92px*var(--px,1))]" />
                    </TableCell>
                    <TableCell className="px-2 tabular text-right">{row.creditsCharged}</TableCell>
                    <TableCell className="px-2 tabular text-right">
                      <Cost row={row} />
                    </TableCell>
                    <TableCell className="px-2 tabular text-right">
                      <Duration row={row} />
                    </TableCell>
                    <TableCell className="px-2 tabular whitespace-normal text-muted-foreground">
                      <span className="block w-[calc(110px*var(--px,1))]">{formatDate(row.createdAt, true)}</span>
                    </TableCell>
                    <TableCell className="px-2">
                      <Outcome row={row} clamp className="w-[calc(200px*var(--px,1))]" />
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
                  <Stat label="Real cost" value={costCell(row).text} muted={costCell(row).muted} />
                  <Stat label="Duration" value={durationText(row)} />
                </dl>
                <span className="tabular text-[length:calc(12px*var(--px,1))] text-text-hint">{formatDate(row.createdAt, true)}</span>
                <Outcome row={row} className="text-[length:calc(13px*var(--px,1))]" />
              </li>
            ))}
          </ul>

          <Pagination base={SCANS_BASE} params={params} page={list.page} pages={list.pages} total={list.total} pageSize={SCAN_PAGE_SIZE} noun="scans" />
        </>
      )}
    </div>
  );
}

/** "3m 26s", or "3m 26s" with "retried over 8 days" under it, so the column stays narrow. */
function Duration({ row }: { row: AdminScanRow }) {
  const { main, retried } = durationParts(row);
  if (!main) return <Dash />;
  return (
    <span className="flex flex-col items-end">
      <span className={cn(row.durationMs === null && "text-muted-foreground")}>{main}</span>
      {retried && <span className="text-[length:calc(12px*var(--px,1))] whitespace-nowrap text-muted-foreground">{retried}</span>}
    </span>
  );
}

function Stat({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <dt className="text-[length:calc(12px*var(--px,1))] text-muted-foreground">{label}</dt>
      <dd className={cn("tabular font-medium", muted && "font-normal text-text-hint")}>{value || <Dash />}</dd>
    </div>
  );
}
