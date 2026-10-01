import Link from "next/link";
import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminBusinessRow } from "@/modules/admin";
import { DeletedBadge, ModelList, ScanBadge, deletedNote, formatDate, frequencyLabel } from "./scan-parts";

const href = (id: string) => `/internal/admin/businesses/${id}`;

export default function BusinessesTable({ rows }: { rows: AdminBusinessRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-surface px-6 py-12 text-center">
        <Store aria-hidden className="size-6 text-text-hint" />
        <p className="text-[15px] font-medium">No businesses yet</p>
        <p className="max-w-sm text-[14px] text-muted-foreground">
          A business shows up here as soon as an agency adds one during setup.
        </p>
      </div>
    );
  }

  const scanning = rows.filter((r) => r.lastScan?.state === "queued" || r.lastScan?.state === "running").length;
  const failed = rows.filter((r) => r.lastScan?.state === "failed").length;
  const deleted = rows.filter((r) => r.deleted).length;

  return (
    <section aria-label="Businesses" className="flex flex-col gap-2">
      <p className="text-[13px] text-muted-foreground">
        {rows.length} {rows.length === 1 ? "business" : "businesses"}, {scanning} scanning now, {failed} with a failed
        last scan{deleted > 0 && `, ${deleted} deleted`}
      </p>

      <div className="hidden rounded-md border border-border bg-surface md:block">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Models</TableHead>
              <TableHead>Last scan</TableHead>
              <TableHead className="text-right">Credits this month</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-[220px]">
                  <span className="flex items-center gap-2">
                    <Link href={href(r.id)} className="truncate font-medium text-primary hover:underline">
                      {r.name}
                    </Link>
                    {r.deleted && <DeletedBadge />}
                  </span>
                  <span className="block truncate text-text-hint">
                    {r.deleted ? deletedNote(r.deleted.at, r.deleted.purgeAfter, true) : r.location || "No location"}
                  </span>
                </TableCell>
                <TableCell className="max-w-[220px]">
                  <AgencyCell agency={r.agency} />
                </TableCell>
                <TableCell>{r.plan ?? <span className="text-text-hint">No plan</span>}</TableCell>
                <TableCell>{frequencyLabel(r.frequency)}</TableCell>
                <TableCell>
                  <ModelList models={r.models} />
                </TableCell>
                <TableCell>
                  <LastScan scan={r.lastScan} />
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.creditsThisMonth.toLocaleString("en-US")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={href(r.id)} className="flex flex-col gap-2 px-4 py-3 text-[13px] hover:bg-muted">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-primary">{r.name}</span>
                    {r.deleted && <DeletedBadge />}
                  </span>
                  <span className="block truncate text-text-hint">{r.agency?.name ?? "No agency"}</span>
                  {r.deleted && (
                    <span className="block text-text-hint">{deletedNote(r.deleted.at, r.deleted.purgeAfter, true)}</span>
                  )}
                </span>
                <LastScan scan={r.lastScan} />
              </span>
              <ModelList models={r.models} className="text-muted-foreground" />
              <span className="text-muted-foreground">
                {r.plan ?? "No plan"}, {frequencyLabel(r.frequency).toLowerCase()},{" "}
                {r.creditsThisMonth.toLocaleString("en-US")} credits this month
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AgencyCell({ agency }: { agency: AdminBusinessRow["agency"] }) {
  if (!agency) return <span className="text-text-hint">No agency</span>;
  return (
    <>
      <span className="flex items-center gap-2">
        <span className="truncate">{agency.name}</span>
        {agency.isTest && <Badge variant="secondary">Test</Badge>}
      </span>
      <span className="block truncate text-text-hint">{agency.ownerEmail ?? "Owner email unknown"}</span>
    </>
  );
}

function LastScan({ scan }: { scan: AdminBusinessRow["lastScan"] }) {
  if (!scan) return <span className="shrink-0 text-text-hint">Never scanned</span>;
  return (
    <span className="flex shrink-0 flex-col items-start gap-0.5">
      <ScanBadge state={scan.state} />
      <span className="text-text-hint">{formatDate(scan.at)}</span>
    </span>
  );
}
