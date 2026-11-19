import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AdminBusinessRow } from "@/modules/admin";
import { ScanStatusBadge, TestBadge } from "../../_components/badges";
import { formatDate } from "../../_components/format";
import { DeletedBadge, PausedBadge, deletedNote, frequencyLabel } from "./scan-parts";

// The pieces the Businesses table (from md up) and the phone cards share, so both say the same thing.

export const businessHref = (id: string) => `/internal/admin/businesses/${id}`;

/** One badge for the state that changes how the row reads: deleted, still in setup, or paused. */
export function StateBadge({ row }: { row: AdminBusinessRow }) {
  if (row.deleted) return <DeletedBadge />;
  if (row.draft) return <Badge variant="secondary">Draft</Badge>;
  if (row.paused) return <PausedBadge />;
  return null;
}

/** The line under the name: when a deleted business goes for good, or where the business is. */
export function placeNote(row: AdminBusinessRow): string {
  if (row.deleted) return deletedNote(row.deleted.at, row.deleted.purgeAfter, true);
  return row.location || "No location";
}

/** The plan, or null when there is none. The Deleted badge already says a deleted business has none. */
export function planText(row: AdminBusinessRow): string | null {
  return row.deleted ? null : row.plan;
}

/** How often it scans, or null when it does not: deleted, still in setup, or paused. */
export function frequencyText(row: AdminBusinessRow): string | null {
  return row.deleted || row.draft || row.paused ? null : frequencyLabel(row.frequency);
}

export function AgencyLink({ agency }: { agency: AdminBusinessRow["agency"] }) {
  if (!agency) return <span className="text-text-hint">No agency</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Link href={`/internal/admin/agencies/${agency.id}`} className="truncate text-primary hover:underline" title={agency.name}>
        {agency.name}
      </Link>
      {agency.isTest && <TestBadge />}
    </span>
  );
}

export function LastScan({ scan }: { scan: AdminBusinessRow["lastScan"] }) {
  if (!scan) return <span className="shrink-0 text-text-hint">Never scanned</span>;
  return (
    <span className="flex shrink-0 flex-col items-start gap-0.5">
      <ScanStatusBadge status={scan.state} />
      <span className="whitespace-nowrap text-text-hint">Started {formatDate(scan.at)}</span>
    </span>
  );
}
